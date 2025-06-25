import { tool } from 'ai';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';
import type { 
  AgentContext, 
  AgentPlan, 
  AgentStep, 
  AgentState,
  StepStatus,
  ExecutionOptions 
} from './agent-types';

// Execution result schemas
const stepExecutionSchema = z.object({
  stepId: z.string(),
  success: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  reasoning: z.string().optional(),
  nextAction: z.enum(['continue', 'pause', 'retry', 'skip', 'abort']).default('continue'),
});

const executionSummarySchema = z.object({
  completedSteps: z.number(),
  failedSteps: z.number(),
  skippedSteps: z.number(),
  totalDuration: z.string(),
  keyResults: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
  success: z.boolean(),
});

export class AgentExecutor {
  private context: AgentContext;
  private options: ExecutionOptions;

  constructor(context: AgentContext, options: ExecutionOptions = {}) {
    this.context = context;
    this.options = {
      maxSteps: 10,
      autoApprove: false,
      showReasoningDetails: true,
      allowReplanning: true,
      timeout: 300000, // 5 minutes
      ...options,
    };
  }

  /**
   * Execute the current plan step by step
   */
  async executePlan(): Promise<AgentContext> {
    if (!this.context.currentPlan) {
      throw new Error('No plan available for execution');
    }

    this.context.state = 'executing';
    this.context.progress.totalSteps = this.context.currentPlan.steps.length;

    try {
      for (const step of this.context.currentPlan.steps) {
        if (this.shouldStop()) {
          break;
        }

        const result = await this.executeStep(step);
        this.updateProgress(step, result);

        if (result.nextAction === 'pause') {
          this.context.state = 'waiting';
          break;
        } else if (result.nextAction === 'abort') {
          this.context.state = 'failed';
          break;
        }
      }

      if (this.context.state === 'executing') {
        this.context.state = 'completed';
      }
    } catch (error) {
      this.context.state = 'failed';
      this.context.errors.push({
        stepId: this.context.progress.currentStep?.id || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    }

    return this.context;
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: AgentStep): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    reasoning?: string;
    nextAction: 'continue' | 'pause' | 'retry' | 'skip' | 'abort';
  }> {
    this.context.progress.currentStep = step;
    step.status = 'running';
    step.startedAt = new Date();

    try {
      let result: any;
      let reasoning: string | undefined;

      switch (step.type) {
        case 'analysis':
          result = await this.executeAnalysisStep(step);
          reasoning = `Analyzed the requirements: ${step.description}`;
          break;

        case 'tool_call':
          if (!step.toolCall) {
            throw new Error('Tool call step missing tool information');
          }
          result = await this.executeToolStep(step);
          reasoning = `Executed ${step.toolCall.name} successfully`;
          break;

        case 'user_input':
          // This will pause execution until user provides input
          reasoning = 'Waiting for user input';
          return { success: true, reasoning, nextAction: 'pause' };

        case 'decision':
          result = await this.executeDecisionStep(step);
          reasoning = `Made decision based on current context`;
          break;

        case 'validation':
          result = await this.executeValidationStep(step);
          reasoning = `Validated results of previous steps`;
          break;

        case 'summary':
          result = await this.executeSummaryStep(step);
          reasoning = `Summarized execution results`;
          break;

        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      step.status = 'completed';
      step.completedAt = new Date();
      step.reasoning = reasoning;

      if (step.toolCall) {
        step.toolCall.result = result;
      }

      return { success: true, result, reasoning, nextAction: 'continue' };

    } catch (error) {
      step.status = 'failed';
      step.completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (step.toolCall) {
        step.toolCall.error = errorMessage;
      }

      this.context.errors.push({
        stepId: step.id,
        error: errorMessage,
        timestamp: new Date(),
      });

      // Decide whether to retry, skip, or abort
      const nextAction = this.shouldRetryStep(step, errorMessage) ? 'retry' : 'skip';
      
      return { success: false, error: errorMessage, nextAction };
    }
  }

  /**
   * Create execution tool for AI models
   */
  static createExecuteStepTool() {
    return tool({
      description: `Execute a single step in the agent plan. This tool handles the actual 
        execution of individual steps and returns the result with reasoning.`,
      parameters: stepExecutionSchema,
      execute: async ({ stepId, success, result, error, reasoning, nextAction }) => {
        return {
          stepId,
          success,
          result,
          error,
          reasoning,
          nextAction,
          timestamp: new Date(),
        };
      },
    });
  }

  /**
   * Create summary tool for AI models
   */
  static createSummaryTool() {
    return tool({
      description: `Generate a comprehensive summary of the agent execution, including 
        results, metrics, and recommendations for future improvements.`,
      parameters: executionSummarySchema,
      execute: async ({ 
        completedSteps, 
        failedSteps, 
        skippedSteps, 
        totalDuration, 
        keyResults, 
        recommendations,
        success 
      }) => {
        return {
          completedSteps,
          failedSteps,
          skippedSteps,
          totalDuration,
          keyResults,
          recommendations: recommendations || [],
          success,
          generatedAt: new Date(),
        };
      },
    });
  }

  /**
   * Create user approval tool for AI models
   */
  static createUserApprovalTool() {
    return tool({
      description: `Request user approval or input before proceeding with execution. 
        Use this when the plan requires user confirmation or additional information.`,
      parameters: z.object({
        prompt: z.string(),
        options: z.array(z.string()).optional(),
        required: z.boolean().default(false),
        context: z.string().optional(),
      }),
      execute: async ({ prompt, options, required, context }) => {
        return {
          prompt,
          options: options || ['Yes', 'No'],
          required,
          context,
          requestedAt: new Date(),
          // Response will be filled by user interaction
          response: null,
        };
      },
    });
  }

  // Private execution methods for different step types
  private async executeAnalysisStep(step: AgentStep): Promise<any> {
    // Store analysis context in memory
    this.context.memory.analysis = {
      query: this.context.originalQuery,
      step: step.description,
      timestamp: new Date(),
    };

    return {
      type: 'analysis',
      summary: step.description,
      context: this.context.originalQuery,
    };
  }

  private async executeToolStep(step: AgentStep): Promise<any> {
    if (!step.toolCall) {
      throw new Error('Tool call information missing');
    }

    // This would integrate with the actual tool execution system
    // For now, return a mock result
    const { name, args } = step.toolCall;
    
    // Store tool execution in memory
    this.context.memory.toolExecutions = this.context.memory.toolExecutions || [];
    this.context.memory.toolExecutions.push({
      tool: name,
      args,
      timestamp: new Date(),
    });

    return {
      tool: name,
      executed: true,
      args,
      timestamp: new Date(),
    };
  }

  private async executeDecisionStep(step: AgentStep): Promise<any> {
    // Make decision based on current context and memory
    const decision = {
      decision: step.description,
      basis: 'Context analysis and previous step results',
      confidence: 0.8,
      alternatives: [],
    };

    this.context.memory.decisions = this.context.memory.decisions || [];
    this.context.memory.decisions.push(decision);

    return decision;
  }

  private async executeValidationStep(step: AgentStep): Promise<any> {
    // Validate previous steps and results
    const validation = {
      validated: true,
      checks: [
        'Previous steps completed successfully',
        'Results meet expected criteria',
        'No critical errors detected',
      ],
      warnings: [],
      timestamp: new Date(),
    };

    // Check for any failures in previous steps
    const hasFailures = this.context.currentPlan?.steps.some(s => s.status === 'failed');
    if (hasFailures) {
      validation.validated = false;
      validation.warnings.push('Some previous steps failed');
    }

    return validation;
  }

  private async executeSummaryStep(step: AgentStep): Promise<any> {
    const completedSteps = this.context.currentPlan?.steps.filter(s => s.status === 'completed').length || 0;
    const failedSteps = this.context.currentPlan?.steps.filter(s => s.status === 'failed').length || 0;
    const totalSteps = this.context.currentPlan?.steps.length || 0;

    return {
      summary: step.description,
      metrics: {
        totalSteps,
        completedSteps,
        failedSteps,
        successRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
      },
      keyResults: this.extractKeyResults(),
      timestamp: new Date(),
    };
  }

  private extractKeyResults(): string[] {
    const results: string[] = [];
    
    // Extract results from tool executions
    if (this.context.memory.toolExecutions) {
      this.context.memory.toolExecutions.forEach((exec: any) => {
        results.push(`Executed ${exec.tool} successfully`);
      });
    }

    // Extract results from decisions
    if (this.context.memory.decisions) {
      this.context.memory.decisions.forEach((decision: any) => {
        results.push(`Decision made: ${decision.decision}`);
      });
    }

    return results;
  }

  private shouldStop(): boolean {
    const maxStepsReached = this.context.progress.completedSteps >= (this.options.maxSteps || 10);
    const hasTimeout = this.options.timeout && (Date.now() - this.context.currentPlan!.createdAt.getTime()) > this.options.timeout;
    
    return maxStepsReached || hasTimeout || this.context.state === 'cancelled';
  }

  private shouldRetryStep(step: AgentStep, error: string): boolean {
    // Don't retry user input steps
    if (step.type === 'user_input') {
      return false;
    }

    // Don't retry if this is already a retry (prevent infinite loops)
    if (this.context.errors.filter(e => e.stepId === step.id).length > 2) {
      return false;
    }

    // Retry for certain types of errors
    const retryableErrors = ['timeout', 'network', 'temporary', 'rate limit'];
    const isRetryable = retryableErrors.some(errorType => 
      error.toLowerCase().includes(errorType)
    );

    return isRetryable;
  }

  private updateProgress(step: AgentStep, result: any): void {
    if (step.status === 'completed') {
      this.context.progress.completedSteps++;
    }

    // Update current step
    this.context.progress.currentStep = step;
  }
}