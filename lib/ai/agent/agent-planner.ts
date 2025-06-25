import { tool } from 'ai';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';
import type { 
  AgentPlan, 
  AgentStep, 
  TaskAnalysis, 
  StepType 
} from './agent-types';

// Schema for task analysis
const taskAnalysisSchema = z.object({
  complexity: z.enum(['simple', 'moderate', 'complex']),
  breakdown: z.array(z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['analysis', 'tool_call', 'user_input', 'decision', 'validation', 'summary']),
    toolName: z.string().optional(),
    requiresApproval: z.boolean().default(false),
    estimatedTime: z.string().optional(),
    dependencies: z.array(z.string()).default([]),
  })),
  estimatedDuration: z.string(),
  risks: z.array(z.string()).default([]),
  userApprovalPoints: z.number().default(0),
});

// Schema for plan refinement
const planRefinementSchema = z.object({
  modifications: z.array(z.object({
    stepId: z.string(),
    action: z.enum(['add', 'remove', 'modify', 'reorder']),
    newStep: z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(['analysis', 'tool_call', 'user_input', 'decision', 'validation', 'summary']),
      toolName: z.string().optional(),
      requiresApproval: z.boolean().default(false),
    }).optional(),
  })),
  reasoning: z.string(),
});

export class AgentPlanner {
  /**
   * Analyze a user query and break it down into a structured plan
   */
  static analyzeTask(query: string, availableTools: string[]): TaskAnalysis {
    // Basic heuristics for task complexity
    const complexity = AgentPlanner.assessComplexity(query, availableTools);
    const steps = AgentPlanner.estimateSteps(query, complexity);
    const tools = AgentPlanner.identifyRequiredTools(query, availableTools);
    const risks = AgentPlanner.identifyRisks(query);
    const approvalPoints = AgentPlanner.countApprovalPoints(query, complexity);

    return {
      complexity,
      estimatedSteps: steps,
      requiredTools: tools,
      risks,
      dependencies: [],
      userApprovalPoints: approvalPoints,
    };
  }

  /**
   * Create a detailed execution plan from task analysis
   */
  static createPlan(
    query: string, 
    analysis: TaskAnalysis,
    availableTools: string[]
  ): AgentPlan {
    const planId = generateUUID();
    const steps = AgentPlanner.generateSteps(query, analysis, availableTools);
    
    return {
      id: planId,
      title: AgentPlanner.generatePlanTitle(query),
      description: AgentPlanner.generatePlanDescription(query, analysis),
      steps,
      estimatedDuration: AgentPlanner.estimateDuration(analysis.complexity, steps.length),
      complexity: analysis.complexity,
      requiresApproval: analysis.userApprovalPoints > 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generate the plan analysis tool for AI models
   */
  static createPlanTool() {
    return tool({
      description: `Analyze a user request and create a detailed step-by-step execution plan. 
        This tool helps break down complex tasks into manageable steps with clear dependencies.
        Use this when the user request requires multiple actions or decision points.`,
      parameters: taskAnalysisSchema,
      execute: async ({ complexity, breakdown, estimatedDuration, risks, userApprovalPoints }) => {
        const steps: AgentStep[] = breakdown.map((step, index) => ({
          id: generateUUID(),
          type: step.type as StepType,
          title: step.title,
          description: step.description,
          status: 'pending',
          toolCall: step.toolName ? {
            name: step.toolName,
            args: {},
          } : undefined,
          userInput: step.type === 'user_input' ? {
            prompt: step.description,
          } : undefined,
          dependencies: step.dependencies,
        }));

        const plan: AgentPlan = {
          id: generateUUID(),
          title: `Multi-step task plan`,
          description: `Breaking down the request into ${breakdown.length} manageable steps`,
          steps,
          estimatedDuration,
          complexity,
          requiresApproval: userApprovalPoints > 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return {
          success: true,
          plan,
          analysis: {
            complexity,
            totalSteps: breakdown.length,
            approvalPoints: userApprovalPoints,
            risks,
          },
        };
      },
    });
  }

  /**
   * Generate the plan refinement tool for dynamic replanning
   */
  static createRefinePlanTool() {
    return tool({
      description: `Refine or modify an existing execution plan based on new information, 
        errors, or user feedback. Use this to adapt the plan during execution.`,
      parameters: planRefinementSchema,
      execute: async ({ modifications, reasoning }) => {
        return {
          success: true,
          modifications,
          reasoning,
          timestamp: new Date(),
        };
      },
    });
  }

  // Private helper methods
  private static assessComplexity(query: string, availableTools: string[]): 'simple' | 'moderate' | 'complex' {
    const indicators = {
      simple: ['show', 'get', 'find', 'what', 'when', 'where'],
      moderate: ['create', 'update', 'analyze', 'compare', 'list'],
      complex: ['build', 'implement', 'design', 'optimize', 'integrate', 'multiple', 'several'],
    };

    const words = query.toLowerCase().split(/\s+/);
    let complexityScore = 0;

    // Check for complexity indicators
    if (words.some(word => indicators.complex.some(ind => word.includes(ind)))) {
      complexityScore += 3;
    }
    if (words.some(word => indicators.moderate.some(ind => word.includes(ind)))) {
      complexityScore += 2;
    }
    if (words.some(word => indicators.simple.some(ind => word.includes(ind)))) {
      complexityScore += 1;
    }

    // Check for multiple requirements
    if (query.includes(' and ') || query.includes(' then ') || query.includes(', ')) {
      complexityScore += 2;
    }

    // Check available tools (more tools = potentially more complex)
    if (availableTools.length > 5) {
      complexityScore += 1;
    }

    if (complexityScore >= 5) return 'complex';
    if (complexityScore >= 3) return 'moderate';
    return 'simple';
  }

  private static estimateSteps(query: string, complexity: string): number {
    const baseSteps = {
      simple: 2,
      moderate: 4,
      complex: 7,
    };

    // Add steps for conjunctions (and, then, etc.)
    const conjunctions = (query.match(/\s+(and|then|after|also|additionally)\s+/gi) || []).length;
    
    return baseSteps[complexity as keyof typeof baseSteps] + conjunctions;
  }

  private static identifyRequiredTools(query: string, availableTools: string[]): string[] {
    const query_lower = query.toLowerCase();
    const requiredTools: string[] = [];

    // Map query patterns to tools
    const toolMappings: Record<string, string[]> = {
      'weather': ['getWeather'],
      'document': ['createDocument', 'updateDocument'],
      'create': ['createDocument'],
      'update': ['updateDocument'],
      'suggest': ['requestSuggestions'],
    };

    for (const [pattern, tools] of Object.entries(toolMappings)) {
      if (query_lower.includes(pattern)) {
        tools.forEach(tool => {
          if (availableTools.includes(tool) && !requiredTools.includes(tool)) {
            requiredTools.push(tool);
          }
        });
      }
    }

    return requiredTools;
  }

  private static identifyRisks(query: string): string[] {
    const risks: string[] = [];
    const query_lower = query.toLowerCase();

    if (query_lower.includes('delete') || query_lower.includes('remove')) {
      risks.push('Data loss risk - destructive operation');
    }
    if (query_lower.includes('all') || query_lower.includes('everything')) {
      risks.push('Broad scope - may affect more than intended');
    }
    if (query_lower.includes('urgent') || query_lower.includes('quickly')) {
      risks.push('Time pressure - may reduce quality checks');
    }

    return risks;
  }

  private static countApprovalPoints(query: string, complexity: string): number {
    let approvalPoints = 0;
    const query_lower = query.toLowerCase();

    // Always require approval for complex tasks
    if (complexity === 'complex') {
      approvalPoints += 1;
    }

    // Require approval for destructive operations
    if (query_lower.includes('delete') || query_lower.includes('remove')) {
      approvalPoints += 1;
    }

    // Require approval for broad operations
    if (query_lower.includes('all') || query_lower.includes('everything')) {
      approvalPoints += 1;
    }

    return approvalPoints;
  }

  private static generateSteps(
    query: string, 
    analysis: TaskAnalysis, 
    availableTools: string[]
  ): AgentStep[] {
    const steps: AgentStep[] = [];
    
    // Always start with analysis step
    steps.push({
      id: generateUUID(),
      type: 'analysis',
      title: 'Analyze Request',
      description: 'Understanding the requirements and context',
      status: 'pending',
      reasoning: 'Initial analysis helps ensure we understand the complete scope',
    });

    // Add tool execution steps based on required tools
    analysis.requiredTools.forEach(toolName => {
      steps.push({
        id: generateUUID(),
        type: 'tool_call',
        title: `Execute ${toolName}`,
        description: `Using ${toolName} to complete part of the task`,
        status: 'pending',
        toolCall: {
          name: toolName,
          args: {},
        },
        dependencies: [steps[0].id], // Depend on analysis
      });
    });

    // Add approval step for complex tasks
    if (analysis.complexity === 'complex' || analysis.userApprovalPoints > 0) {
      steps.push({
        id: generateUUID(),
        type: 'user_input',
        title: 'Request Approval',
        description: 'Seeking user confirmation before proceeding',
        status: 'pending',
        userInput: {
          prompt: 'Do you want me to proceed with this plan?',
        },
        dependencies: steps.slice(0, -1).map(s => s.id), // Depend on previous steps
      });
    }

    // Add validation step
    if (steps.length > 2) {
      steps.push({
        id: generateUUID(),
        type: 'validation',
        title: 'Validate Results',
        description: 'Checking that the task was completed successfully',
        status: 'pending',
        dependencies: steps.slice(0, -1).map(s => s.id),
      });
    }

    // Always end with summary
    steps.push({
      id: generateUUID(),
      type: 'summary',
      title: 'Summarize Results',
      description: 'Providing a summary of what was accomplished',
      status: 'pending',
      dependencies: steps.slice(0, -1).map(s => s.id),
    });

    return steps;
  }

  private static generatePlanTitle(query: string): string {
    if (query.length > 50) {
      return query.substring(0, 47) + '...';
    }
    return query;
  }

  private static generatePlanDescription(query: string, analysis: TaskAnalysis): string {
    return `${analysis.complexity} task requiring ${analysis.estimatedSteps} steps. ` +
           `Will use tools: ${analysis.requiredTools.join(', ') || 'none'}. ` +
           `${analysis.userApprovalPoints > 0 ? 'Requires user approval.' : 'Fully automated.'}`;
  }

  private static estimateDuration(complexity: string, stepCount: number): string {
    const baseTime = {
      simple: 30,
      moderate: 90,
      complex: 180,
    };

    const totalSeconds = baseTime[complexity as keyof typeof baseTime] + (stepCount * 15);
    
    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    } else if (totalSeconds < 3600) {
      return `${Math.ceil(totalSeconds / 60)} minutes`;
    } else {
      return `${Math.ceil(totalSeconds / 3600)} hours`;
    }
  }
}