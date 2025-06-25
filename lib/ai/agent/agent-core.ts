import { generateUUID } from '@/lib/utils';
import { AgentPlanner } from './agent-planner';
import { AgentExecutor } from './agent-executor';
import { AgentRecovery } from './agent-recovery';
import type { 
  AgentContext, 
  AgentPlan, 
  AgentState,
  ExecutionOptions,
  TaskAnalysis 
} from './agent-types';

/**
 * Main agent orchestration class that coordinates planning and execution
 */
export class AgentCore {
  private context: AgentContext;
  private executor?: AgentExecutor;

  constructor(
    sessionId: string,
    userId: string,
    originalQuery: string,
    options: Partial<AgentContext['userPreferences']> = {}
  ) {
    this.context = {
      sessionId,
      userId,
      originalQuery,
      state: 'planning',
      progress: {
        completedSteps: 0,
        totalSteps: 0,
      },
      memory: {},
      errors: [],
      userPreferences: {
        autoApprove: false,
        showReasoningDetails: true,
        maxStepsWithoutApproval: 3,
        ...options,
      },
    };
  }

  /**
   * Get current agent context
   */
  getContext(): AgentContext {
    return { ...this.context };
  }

  /**
   * Update agent context
   */
  updateContext(updates: Partial<AgentContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Analyze the task and create an execution plan
   */
  async createPlan(availableTools: string[]): Promise<AgentPlan> {
    this.context.state = 'planning';

    try {
      // Analyze the task complexity and requirements
      const analysis = AgentPlanner.analyzeTask(this.context.originalQuery, availableTools);
      
      // Create detailed execution plan
      const plan = AgentPlanner.createPlan(
        this.context.originalQuery,
        analysis,
        availableTools
      );

      this.context.currentPlan = plan;
      this.context.progress.totalSteps = plan.steps.length;

      return plan;
    } catch (error) {
      this.context.state = 'failed';
      this.context.errors.push({
        stepId: 'planning',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /**
   * Execute the current plan
   */
  async executePlan(options: ExecutionOptions = {}): Promise<AgentContext> {
    if (!this.context.currentPlan) {
      throw new Error('No plan available. Call createPlan() first.');
    }

    this.executor = new AgentExecutor(this.context, options);
    this.context = await this.executor.executePlan();

    return this.context;
  }

  /**
   * Handle user input during execution
   */
  async provideUserInput(stepId: string, input: string): Promise<AgentContext> {
    if (!this.context.currentPlan) {
      throw new Error('No active plan');
    }

    const step = this.context.currentPlan.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    if (step.type !== 'user_input' || !step.userInput) {
      throw new Error(`Step ${stepId} is not waiting for user input`);
    }

    // Store user response
    step.userInput.response = input;
    step.status = 'completed';
    step.completedAt = new Date();

    // Resume execution if we were waiting
    if (this.context.state === 'waiting') {
      this.context.state = 'executing';
      
      if (this.executor) {
        this.context = await this.executor.executePlan();
      }
    }

    return this.context;
  }

  /**
   * Cancel the current execution
   */
  cancel(): void {
    this.context.state = 'cancelled';
  }

  /**
   * Check if agent requires user interaction
   */
  requiresUserInteraction(): boolean {
    return this.context.state === 'waiting' && 
           this.context.progress.currentStep?.type === 'user_input';
  }

  /**
   * Get the current step that needs user input
   */
  getCurrentUserInputStep() {
    if (!this.requiresUserInteraction()) {
      return null;
    }

    return this.context.progress.currentStep;
  }

  /**
   * Replan based on new information or errors
   */
  async replan(reason: string, availableTools: string[]): Promise<AgentPlan> {
    if (!this.context.currentPlan) {
      throw new Error('No current plan to modify');
    }

    // Store the reason for replanning
    this.context.memory.replanning = this.context.memory.replanning || [];
    this.context.memory.replanning.push({
      reason,
      timestamp: new Date(),
      originalPlan: this.context.currentPlan.id,
    });

    // Create new plan based on current context
    const newPlan = await this.createPlan(availableTools);
    
    return newPlan;
  }

  /**
   * Get execution summary
   */
  getExecutionSummary() {
    if (!this.context.currentPlan) {
      return null;
    }

    const steps = this.context.currentPlan.steps;
    const completed = steps.filter(s => s.status === 'completed').length;
    const failed = steps.filter(s => s.status === 'failed').length;
    const pending = steps.filter(s => s.status === 'pending').length;
    const running = steps.filter(s => s.status === 'running').length;

    return {
      planId: this.context.currentPlan.id,
      planTitle: this.context.currentPlan.title,
      state: this.context.state,
      progress: {
        total: steps.length,
        completed,
        failed,
        pending,
        running,
        percentage: steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0,
      },
      duration: this.calculateDuration(),
      errors: this.context.errors,
      hasUserInput: this.requiresUserInteraction(),
    };
  }

  /**
   * Get detailed step information
   */
  getStepDetails(stepId: string) {
    if (!this.context.currentPlan) {
      return null;
    }

    const step = this.context.currentPlan.steps.find(s => s.id === stepId);
    if (!step) {
      return null;
    }

    return {
      ...step,
      dependencies: step.dependencies || [],
      canExecute: this.canExecuteStep(step),
      estimatedTime: this.estimateStepTime(step),
    };
  }

  /**
   * Static method to create agent tools for AI models
   */
  static createAgentTools() {
    return {
      planTask: AgentPlanner.createPlanTool(),
      refinePlan: AgentPlanner.createRefinePlanTool(),
      executeStep: AgentExecutor.createExecuteStepTool(),
      summarizeExecution: AgentExecutor.createSummaryTool(),
      requestApproval: AgentExecutor.createUserApprovalTool(),
      recoverFromError: AgentRecovery.createRecoveryTool(),
    };
  }

  // Private helper methods
  private canExecuteStep(step: any): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every((depId: string) => {
      const depStep = this.context.currentPlan?.steps.find(s => s.id === depId);
      return depStep?.status === 'completed';
    });
  }

  private estimateStepTime(step: any): string {
    const estimates = {
      analysis: '15 seconds',
      tool_call: '30 seconds',
      user_input: 'User dependent',
      decision: '10 seconds',
      validation: '15 seconds',
      summary: '10 seconds',
    };

    return estimates[step.type as keyof typeof estimates] || '20 seconds';
  }

  private calculateDuration(): string {
    if (!this.context.currentPlan) {
      return '0 seconds';
    }

    const startTime = this.context.currentPlan.createdAt.getTime();
    const endTime = this.context.state === 'completed' 
      ? (this.context.currentPlan.steps.find(s => s.completedAt)?.completedAt?.getTime() || Date.now())
      : Date.now();

    const durationMs = endTime - startTime;
    const seconds = Math.floor(durationMs / 1000);

    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes`;
    } else {
      return `${Math.floor(seconds / 3600)} hours`;
    }
  }
}