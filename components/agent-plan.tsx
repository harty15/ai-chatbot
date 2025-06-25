'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Play, User, Cog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface AgentStep {
  id: string;
  type: 'analysis' | 'tool_call' | 'user_input' | 'decision' | 'validation' | 'summary';
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  reasoning?: string;
  estimatedTime?: string;
}

interface AgentPlan {
  id: string;
  title: string;
  description: string;
  steps: AgentStep[];
  estimatedDuration?: string;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresApproval: boolean;
}

interface AgentPlanProps {
  plan: AgentPlan;
  isExecuting?: boolean;
  currentStepId?: string;
}

const stepTypeIcons = {
  analysis: Cog,
  tool_call: Play,
  user_input: User,
  decision: AlertCircle,
  validation: CheckCircle,
  summary: CheckCircle,
};

const stepTypeColors = {
  analysis: 'text-blue-600',
  tool_call: 'text-green-600',
  user_input: 'text-purple-600',
  decision: 'text-orange-600',
  validation: 'text-emerald-600',
  summary: 'text-gray-600',
};

const statusColors = {
  pending: 'border-gray-200 bg-gray-50',
  running: 'border-blue-300 bg-blue-50',
  completed: 'border-green-300 bg-green-50',
  failed: 'border-red-300 bg-red-50',
  skipped: 'border-yellow-300 bg-yellow-50',
};

const complexityColors = {
  simple: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  complex: 'bg-red-100 text-red-800',
};

export function AgentPlan({ plan, isExecuting = false, currentStepId }: AgentPlanProps) {
  const completedSteps = plan.steps.filter(step => step.status === 'completed').length;
  const progressPercentage = plan.steps.length > 0 ? (completedSteps / plan.steps.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl"
    >
      <Card className="border-blue-200 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                🤖 {plan.title}
              </CardTitle>
              <p className="text-sm text-gray-600">{plan.description}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={complexityColors[plan.complexity]}>
                {plan.complexity}
              </Badge>
              {plan.requiresApproval && (
                <Badge variant="outline" className="border-purple-200 text-purple-700">
                  Requires Approval
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Progress: {completedSteps}/{plan.steps.length} steps
              </span>
              <span className="text-gray-600">
                {plan.estimatedDuration && `Est. ${plan.estimatedDuration}`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {plan.steps.map((step, index) => {
            const StepIcon = stepTypeIcons[step.type];
            const isCurrentStep = currentStepId === step.id;
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative flex items-start gap-3 p-3 rounded-lg border transition-all duration-200',
                  statusColors[step.status],
                  isCurrentStep && 'ring-2 ring-blue-400 ring-opacity-50'
                )}
              >
                {/* Step Number */}
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step.status === 'completed' 
                    ? 'bg-green-600 text-white' 
                    : step.status === 'running'
                    ? 'bg-blue-600 text-white'
                    : step.status === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                )}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : step.status === 'running' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <StepIcon className={cn('w-4 h-4', stepTypeColors[step.type])} />
                    <span className="font-medium text-gray-900">{step.title}</span>
                    {step.estimatedTime && (
                      <Badge variant="outline" className="text-xs">
                        {step.estimatedTime}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600">{step.description}</p>
                  
                  {step.reasoning && (
                    <div className="text-xs text-gray-500 italic">
                      💭 {step.reasoning}
                    </div>
                  )}

                  {/* Status Indicator */}
                  {step.status === 'running' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 bg-blue-600 rounded-full"
                      />
                      <span>In progress...</span>
                    </div>
                  )}
                  
                  {step.status === 'failed' && (
                    <div className="text-sm text-red-600">
                      ❌ Step failed
                    </div>
                  )}
                </div>

                {/* Connecting Line */}
                {index < plan.steps.length - 1 && (
                  <div className="absolute left-7 top-12 w-0.5 h-4 bg-gray-300" />
                )}
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}