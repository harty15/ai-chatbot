export type AgentState = 
  | 'planning'      // Agent is analyzing and creating plan
  | 'executing'     // Agent is executing steps
  | 'waiting'       // Agent is waiting for user input/approval
  | 'completed'     // Task completed successfully
  | 'failed'        // Task failed with error
  | 'cancelled';    // User cancelled the task

export type StepType =
  | 'analysis'      // Understanding/analyzing the problem
  | 'tool_call'     // Executing a tool
  | 'user_input'    // Requesting user input
  | 'decision'      // Making a decision point
  | 'validation'    // Validating results
  | 'summary';      // Summarizing progress

export type StepStatus =
  | 'pending'       // Step not started
  | 'running'       // Step in progress
  | 'completed'     // Step completed successfully
  | 'failed'        // Step failed
  | 'skipped';      // Step was skipped

export interface AgentStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  status: StepStatus;
  reasoning?: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
    result?: any;
    error?: string;
  };
  userInput?: {
    prompt: string;
    response?: string;
  };
  startedAt?: Date;
  completedAt?: Date;
  dependencies?: string[]; // IDs of steps this depends on
}

export interface AgentPlan {
  id: string;
  title: string;
  description: string;
  steps: AgentStep[];
  estimatedDuration?: string;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentContext {
  sessionId: string;
  userId: string;
  originalQuery: string;
  currentPlan?: AgentPlan;
  state: AgentState;
  progress: {
    completedSteps: number;
    totalSteps: number;
    currentStep?: AgentStep;
  };
  memory: Record<string, any>; // Shared context between steps
  errors: Array<{
    stepId: string;
    error: string;
    timestamp: Date;
  }>;
  userPreferences: {
    autoApprove: boolean;
    showReasoningDetails: boolean;
    maxStepsWithoutApproval: number;
  };
}

export interface AgentMessage {
  id: string;
  type: 'plan' | 'step_start' | 'step_complete' | 'step_failed' | 'user_input_required' | 'final_result';
  agentContext: AgentContext;
  step?: AgentStep;
  content?: string;
  timestamp: Date;
}

// Tool calling enhancement for agents
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiresApproval?: boolean;
  maxRetries?: number;
  timeout?: number;
}

// Planning and execution types
export interface TaskAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  requiredTools: string[];
  risks: string[];
  dependencies: string[];
  userApprovalPoints: number;
}

export interface ExecutionOptions {
  maxSteps?: number;
  autoApprove?: boolean;
  showReasoningDetails?: boolean;
  allowReplanning?: boolean;
  timeout?: number;
}