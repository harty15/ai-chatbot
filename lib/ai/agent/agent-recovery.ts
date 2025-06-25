import { tool } from 'ai';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';
import type { 
  AgentContext, 
  AgentPlan, 
  AgentStep, 
  StepStatus 
} from './agent-types';
import { AgentPlanner } from './agent-planner';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Recovery strategy types
export type RecoveryStrategy = 
  | 'retry'           // Retry the failed step
  | 'skip'            // Skip the failed step
  | 'alternative'     // Use alternative approach
  | 'replan'          // Create new plan
  | 'manual'          // Require manual intervention
  | 'abort';          // Abort execution

export interface ErrorAnalysis {
  severity: ErrorSeverity;
  category: 'network' | 'permission' | 'validation' | 'logic' | 'resource' | 'timeout' | 'unknown';
  isRetryable: boolean;
  affectsSubsequentSteps: boolean;
  recommendedStrategy: RecoveryStrategy;
  alternatives: RecoveryStrategy[];
  estimatedRecoveryTime: string;
}

export interface RecoveryPlan {
  id: string;
  originalError: string;
  analysis: ErrorAnalysis;
  selectedStrategy: RecoveryStrategy;
  modifiedSteps: AgentStep[];
  newSteps: AgentStep[];
  estimatedDelay: string;
  confidence: number;
  createdAt: Date;
}

export class AgentRecovery {
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Analyze an error and determine recovery options
   */
  analyzeError(error: string, failedStepId: string): ErrorAnalysis {
    const errorLower = error.toLowerCase();
    
    // Determine error category
    const category = this.categorizeError(errorLower);
    
    // Determine severity
    const severity = this.determineSeverity(errorLower, category);
    
    // Check if retryable
    const isRetryable = this.isErrorRetryable(errorLower, category);
    
    // Check impact on subsequent steps
    const affectsSubsequentSteps = this.checkSubsequentImpact(failedStepId, category);
    
    // Recommend strategy
    const recommendedStrategy = this.recommendStrategy(severity, category, isRetryable);
    
    // Get alternatives
    const alternatives = this.getAlternativeStrategies(recommendedStrategy, isRetryable);
    
    // Estimate recovery time
    const estimatedRecoveryTime = this.estimateRecoveryTime(recommendedStrategy, severity);

    return {
      severity,
      category,
      isRetryable,
      affectsSubsequentSteps,
      recommendedStrategy,
      alternatives,
      estimatedRecoveryTime,
    };
  }

  /**
   * Create a recovery plan based on error analysis
   */
  async createRecoveryPlan(
    error: string, 
    failedStepId: string, 
    strategy: RecoveryStrategy
  ): Promise<RecoveryPlan> {
    const analysis = this.analyzeError(error, failedStepId);
    const planId = generateUUID();
    
    let modifiedSteps: AgentStep[] = [];
    let newSteps: AgentStep[] = [];
    let estimatedDelay = '0 seconds';
    let confidence = 0.5;

    const failedStep = this.context.currentPlan?.steps.find(s => s.id === failedStepId);
    if (!failedStep) {
      throw new Error(`Failed step ${failedStepId} not found`);
    }

    switch (strategy) {
      case 'retry':
        modifiedSteps = this.createRetrySteps(failedStep);
        estimatedDelay = '30 seconds';
        confidence = analysis.isRetryable ? 0.8 : 0.3;
        break;

      case 'skip':
        modifiedSteps = this.createSkipSteps(failedStepId);
        estimatedDelay = '5 seconds';
        confidence = analysis.affectsSubsequentSteps ? 0.4 : 0.7;
        break;

      case 'alternative':
        newSteps = await this.createAlternativeSteps(failedStep, error);
        estimatedDelay = '1 minute';
        confidence = 0.6;
        break;

      case 'replan':
        const newPlan = await this.createReplan(error, failedStepId);
        newSteps = newPlan.steps;
        estimatedDelay = '2 minutes';
        confidence = 0.8;
        break;

      case 'manual':
        newSteps = this.createManualInterventionSteps(failedStep, error);
        estimatedDelay = 'User dependent';
        confidence = 0.9;
        break;

      case 'abort':
        estimatedDelay = '0 seconds';
        confidence = 1.0;
        break;
    }

    return {
      id: planId,
      originalError: error,
      analysis,
      selectedStrategy: strategy,
      modifiedSteps,
      newSteps,
      estimatedDelay,
      confidence,
      createdAt: new Date(),
    };
  }

  /**
   * Apply a recovery plan to the current context
   */
  applyRecoveryPlan(recoveryPlan: RecoveryPlan): AgentContext {
    if (!this.context.currentPlan) {
      throw new Error('No current plan to apply recovery to');
    }

    const updatedSteps = [...this.context.currentPlan.steps];
    
    // Apply modifications to existing steps
    recoveryPlan.modifiedSteps.forEach(modifiedStep => {
      const index = updatedSteps.findIndex(s => s.id === modifiedStep.id);
      if (index !== -1) {
        updatedSteps[index] = modifiedStep;
      }
    });

    // Add new steps if any
    if (recoveryPlan.newSteps.length > 0) {
      // Insert new steps after the failed step
      const failedStepIndex = updatedSteps.findIndex(s => s.status === 'failed');
      if (failedStepIndex !== -1) {
        updatedSteps.splice(failedStepIndex + 1, 0, ...recoveryPlan.newSteps);
      } else {
        updatedSteps.push(...recoveryPlan.newSteps);
      }
    }

    // Update the plan
    const updatedPlan: AgentPlan = {
      ...this.context.currentPlan,
      steps: updatedSteps,
      updatedAt: new Date(),
    };

    // Update context
    const updatedContext: AgentContext = {
      ...this.context,
      currentPlan: updatedPlan,
      progress: {
        ...this.context.progress,
        totalSteps: updatedSteps.length,
      },
      memory: {
        ...this.context.memory,
        recoveryPlans: [
          ...(this.context.memory.recoveryPlans || []),
          recoveryPlan,
        ],
      },
    };

    return updatedContext;
  }

  /**
   * Create tool for dynamic error recovery
   */
  static createRecoveryTool() {
    return tool({
      description: `Handle errors during agent execution and create recovery plans. 
        This tool analyzes errors and proposes strategies to recover from failures.`,
      parameters: z.object({
        error: z.string(),
        failedStepId: z.string(),
        strategy: z.enum(['retry', 'skip', 'alternative', 'replan', 'manual', 'abort']),
        context: z.string().optional(),
      }),
      execute: async ({ error, failedStepId, strategy, context }) => {
        // This would integrate with the actual agent context
        // For now, return a mock recovery plan
        return {
          success: true,
          strategy,
          estimatedRecoveryTime: '1 minute',
          confidence: 0.7,
          modifiedSteps: 1,
          newSteps: strategy === 'alternative' ? 2 : 0,
          reasoning: `Applied ${strategy} strategy to recover from error: ${error}`,
          timestamp: new Date().toISOString(),
        };
      },
    });
  }

  // Private helper methods
  private categorizeError(error: string): ErrorAnalysis['category'] {
    if (error.includes('network') || error.includes('connection') || error.includes('timeout')) {
      return 'network';
    }
    if (error.includes('permission') || error.includes('unauthorized') || error.includes('forbidden')) {
      return 'permission';
    }
    if (error.includes('validation') || error.includes('invalid') || error.includes('format')) {
      return 'validation';
    }
    if (error.includes('resource') || error.includes('memory') || error.includes('disk')) {
      return 'resource';
    }
    if (error.includes('timeout') || error.includes('deadline')) {
      return 'timeout';
    }
    if (error.includes('logic') || error.includes('assertion') || error.includes('unexpected')) {
      return 'logic';
    }
    return 'unknown';
  }

  private determineSeverity(error: string, category: ErrorAnalysis['category']): ErrorSeverity {
    // Critical indicators
    if (error.includes('critical') || error.includes('fatal') || error.includes('security')) {
      return 'critical';
    }
    
    // High severity by category
    if (category === 'permission' || category === 'logic') {
      return 'high';
    }
    
    // Medium severity
    if (category === 'validation' || category === 'resource') {
      return 'medium';
    }
    
    // Low severity (typically retryable)
    if (category === 'network' || category === 'timeout') {
      return 'low';
    }
    
    return 'medium';
  }

  private isErrorRetryable(error: string, category: ErrorAnalysis['category']): boolean {
    // Network and timeout errors are usually retryable
    if (category === 'network' || category === 'timeout') {
      return true;
    }
    
    // Resource errors might be retryable after a delay
    if (category === 'resource') {
      return true;
    }
    
    // Permission and validation errors usually aren't retryable
    if (category === 'permission' || category === 'validation' || category === 'logic') {
      return false;
    }
    
    return false;
  }

  private checkSubsequentImpact(failedStepId: string, category: ErrorAnalysis['category']): boolean {
    if (!this.context.currentPlan) return false;
    
    const failedStepIndex = this.context.currentPlan.steps.findIndex(s => s.id === failedStepId);
    if (failedStepIndex === -1) return false;
    
    // Check if subsequent steps depend on the failed step
    const subsequentSteps = this.context.currentPlan.steps.slice(failedStepIndex + 1);
    const hasDependent = subsequentSteps.some(step => 
      step.dependencies?.includes(failedStepId)
    );
    
    return hasDependent || category === 'permission' || category === 'logic';
  }

  private recommendStrategy(
    severity: ErrorSeverity, 
    category: ErrorAnalysis['category'], 
    isRetryable: boolean
  ): RecoveryStrategy {
    if (severity === 'critical') {
      return 'abort';
    }
    
    if (severity === 'high') {
      return category === 'permission' ? 'manual' : 'replan';
    }
    
    if (isRetryable) {
      return 'retry';
    }
    
    if (category === 'validation') {
      return 'alternative';
    }
    
    return 'skip';
  }

  private getAlternativeStrategies(
    recommended: RecoveryStrategy, 
    isRetryable: boolean
  ): RecoveryStrategy[] {
    const alternatives: RecoveryStrategy[] = [];
    
    if (recommended !== 'retry' && isRetryable) {
      alternatives.push('retry');
    }
    
    if (recommended !== 'skip') {
      alternatives.push('skip');
    }
    
    if (recommended !== 'alternative') {
      alternatives.push('alternative');
    }
    
    if (recommended !== 'replan') {
      alternatives.push('replan');
    }
    
    if (recommended !== 'manual') {
      alternatives.push('manual');
    }
    
    return alternatives;
  }

  private estimateRecoveryTime(strategy: RecoveryStrategy, severity: ErrorSeverity): string {
    const baseTime = {
      retry: 30,
      skip: 5,
      alternative: 60,
      replan: 120,
      manual: 300,
      abort: 0,
    };
    
    const severityMultiplier = {
      low: 1,
      medium: 1.5,
      high: 2,
      critical: 3,
    };
    
    const totalSeconds = baseTime[strategy] * severityMultiplier[severity];
    
    if (strategy === 'manual') {
      return 'User dependent';
    }
    
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    } else {
      return `${Math.ceil(totalSeconds / 60)} minutes`;
    }
  }

  private createRetrySteps(failedStep: AgentStep): AgentStep[] {
    return [{
      ...failedStep,
      id: generateUUID(),
      status: 'pending',
      reasoning: `Retrying failed step: ${failedStep.title}`,
      startedAt: undefined,
      completedAt: undefined,
    }];
  }

  private createSkipSteps(failedStepId: string): AgentStep[] {
    // Mark the failed step as skipped
    return [];
  }

  private async createAlternativeSteps(failedStep: AgentStep, error: string): Promise<AgentStep[]> {
    // Create alternative approach steps
    return [{
      id: generateUUID(),
      type: 'tool_call',
      title: `Alternative: ${failedStep.title}`,
      description: `Alternative approach to: ${failedStep.description}`,
      status: 'pending',
      reasoning: `Using alternative method due to error: ${error}`,
    }];
  }

  private async createReplan(error: string, failedStepId: string): Promise<AgentPlan> {
    // This would use the AgentPlanner to create a new plan
    // For now, return a simplified version
    const availableTools = ['getWeather', 'createDocument', 'updateDocument'];
    const analysis = AgentPlanner.analyzeTask(
      `Recover from error: ${error}`, 
      availableTools
    );
    
    return AgentPlanner.createPlan(
      `Recovery plan for failed step`,
      analysis,
      availableTools
    );
  }

  private createManualInterventionSteps(failedStep: AgentStep, error: string): AgentStep[] {
    return [{
      id: generateUUID(),
      type: 'user_input',
      title: 'Manual Intervention Required',
      description: `Please resolve the error manually: ${error}`,
      status: 'pending',
      userInput: {
        prompt: `The step "${failedStep.title}" failed with error: ${error}. Please provide instructions on how to proceed.`,
      },
      reasoning: 'Manual intervention required due to error that cannot be automatically resolved',
    }];
  }
}