// Agent system exports
export { AgentCore } from './agent-core';
export { AgentPlanner } from './agent-planner';
export { AgentExecutor } from './agent-executor';
export { AgentRecovery } from './agent-recovery';

// Type exports
export type {
  AgentState,
  StepType,
  StepStatus,
  AgentStep,
  AgentPlan,
  AgentContext,
  AgentMessage,
  AgentTool,
  TaskAnalysis,
  ExecutionOptions,
} from './agent-types';

// Utility functions
export const createAgentTools = () => AgentCore.createAgentTools();

// Agent state predicates
export const isAgentWaiting = (context: AgentContext): boolean => 
  context.state === 'waiting';

export const isAgentExecuting = (context: AgentContext): boolean => 
  context.state === 'executing';

export const isAgentCompleted = (context: AgentContext): boolean => 
  context.state === 'completed';

export const requiresUserInput = (context: AgentContext): boolean => 
  context.state === 'waiting' && 
  context.progress.currentStep?.type === 'user_input';

// Agent progress utilities
export const getProgressPercentage = (context: AgentContext): number => {
  if (context.progress.totalSteps === 0) return 0;
  return Math.round((context.progress.completedSteps / context.progress.totalSteps) * 100);
};

export const getCurrentStepNumber = (context: AgentContext): number => {
  if (!context.currentPlan || !context.progress.currentStep) return 0;
  
  const stepIndex = context.currentPlan.steps.findIndex(
    step => step.id === context.progress.currentStep?.id
  );
  
  return stepIndex >= 0 ? stepIndex + 1 : 0;
};

// Agent tool names for easy reference
export const AGENT_TOOL_NAMES = {
  PLAN_TASK: 'planTask',
  REFINE_PLAN: 'refinePlan', 
  EXECUTE_STEP: 'executeStep',
  SUMMARIZE_EXECUTION: 'summarizeExecution',
  REQUEST_APPROVAL: 'requestApproval',
} as const;