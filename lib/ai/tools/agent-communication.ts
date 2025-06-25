import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool for showing progress updates during agent execution
 */
export const showProgress = tool({
  description: `Display a progress update to the user showing current step, completion percentage, 
    and estimated time remaining. Use this to keep users informed during long-running operations.`,
  parameters: z.object({
    currentStep: z.string(),
    stepNumber: z.number(),
    totalSteps: z.number(),
    estimatedTimeRemaining: z.string().optional(),
    details: z.string().optional(),
  }),
  execute: async ({ currentStep, stepNumber, totalSteps, estimatedTimeRemaining, details }) => {
    const percentage = Math.round((stepNumber / totalSteps) * 100);
    
    return {
      type: 'progress_update',
      currentStep,
      stepNumber,
      totalSteps,
      percentage,
      estimatedTimeRemaining,
      details,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Tool for announcing the start of agent mode execution
 */
export const announceAgentMode = tool({
  description: `Announce that agent mode has been activated and provide an overview of the plan.
    Use this at the beginning of complex multi-step operations to set user expectations.`,
  parameters: z.object({
    planTitle: z.string(),
    totalSteps: z.number(),
    estimatedDuration: z.string(),
    complexity: z.enum(['simple', 'moderate', 'complex']),
    requiresApproval: z.boolean(),
    keyCapabilities: z.array(z.string()).optional(),
  }),
  execute: async ({ 
    planTitle, 
    totalSteps, 
    estimatedDuration, 
    complexity, 
    requiresApproval,
    keyCapabilities 
  }) => {
    return {
      type: 'agent_announcement',
      planTitle,
      totalSteps,
      estimatedDuration,
      complexity,
      requiresApproval,
      keyCapabilities: keyCapabilities || [
        'Multi-step task breakdown',
        'Tool coordination',
        'Progress tracking',
        'Error recovery',
        'Result validation'
      ],
      message: `🤖 **Agent Mode Activated**\n\nI'll handle this complex request using my multi-step capabilities. Here's what I'll do:\n\n**Plan:** ${planTitle}\n**Steps:** ${totalSteps}\n**Duration:** ${estimatedDuration}\n**Complexity:** ${complexity}\n${requiresApproval ? '**Note:** Will request approval before critical actions' : '**Note:** Fully automated execution'}`,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Tool for requesting specific user decisions during execution
 */
export const requestDecision = tool({
  description: `Request a specific decision from the user with clear options and context.
    Use this when the agent needs user input to proceed with execution.`,
  parameters: z.object({
    decision: z.string(),
    context: z.string(),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
      description: z.string().optional(),
    })),
    defaultOption: z.string().optional(),
    consequences: z.string().optional(),
  }),
  execute: async ({ decision, context, options, defaultOption, consequences }) => {
    return {
      type: 'user_decision_request',
      decision,
      context,
      options,
      defaultOption,
      consequences,
      requestId: `decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Tool for explaining the reasoning behind agent decisions
 */
export const explainReasoning = tool({
  description: `Provide detailed reasoning for agent decisions and actions. Use this to maintain
    transparency about the agent's decision-making process.`,
  parameters: z.object({
    stepTitle: z.string(),
    reasoning: z.string(),
    factors: z.array(z.string()),
    alternatives: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1),
    risks: z.array(z.string()).optional(),
  }),
  execute: async ({ stepTitle, reasoning, factors, alternatives, confidence, risks }) => {
    return {
      type: 'reasoning_explanation',
      stepTitle,
      reasoning,
      factors,
      alternatives: alternatives || [],
      confidence,
      risks: risks || [],
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Tool for handling and recovering from errors during execution
 */
export const handleError = tool({
  description: `Handle errors that occur during agent execution and propose recovery strategies.
    Use this when steps fail and alternative approaches are needed.`,
  parameters: z.object({
    errorType: z.string(),
    errorMessage: z.string(),
    failedStep: z.string(),
    recoveryOptions: z.array(z.object({
      strategy: z.string(),
      description: z.string(),
      likelihood: z.enum(['low', 'medium', 'high']),
    })),
    skipPossible: z.boolean(),
    criticalFailure: z.boolean(),
  }),
  execute: async ({ 
    errorType, 
    errorMessage, 
    failedStep, 
    recoveryOptions, 
    skipPossible, 
    criticalFailure 
  }) => {
    return {
      type: 'error_recovery',
      errorType,
      errorMessage,
      failedStep,
      recoveryOptions,
      skipPossible,
      criticalFailure,
      timestamp: new Date().toISOString(),
    };
  },
});

/**
 * Tool for providing final execution summary
 */
export const provideSummary = tool({
  description: `Provide a comprehensive summary of agent execution including results, 
    metrics, and recommendations. Use this at the end of multi-step operations.`,
  parameters: z.object({
    planTitle: z.string(),
    executionStatus: z.enum(['completed', 'partial', 'failed']),
    completedSteps: z.number(),
    totalSteps: z.number(),
    duration: z.string(),
    keyResults: z.array(z.string()),
    failures: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    nextSteps: z.array(z.string()).optional(),
  }),
  execute: async ({ 
    planTitle,
    executionStatus,
    completedSteps,
    totalSteps,
    duration,
    keyResults,
    failures,
    recommendations,
    nextSteps
  }) => {
    const successRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return {
      type: 'execution_summary',
      planTitle,
      executionStatus,
      completedSteps,
      totalSteps,
      successRate,
      duration,
      keyResults,
      failures: failures || [],
      recommendations: recommendations || [],
      nextSteps: nextSteps || [],
      timestamp: new Date().toISOString(),
    };
  },
});

// Export all agent communication tools
export const agentCommunicationTools = {
  showProgress,
  announceAgentMode,
  requestDecision,
  explainReasoning,
  handleError,
  provideSummary,
};

export const agentCommunicationToolNames = Object.keys(agentCommunicationTools);