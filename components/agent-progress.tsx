'use client';

import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface AgentProgressProps {
  currentStep: string;
  stepNumber: number;
  totalSteps: number;
  percentage: number;
  estimatedTimeRemaining?: string;
  details?: string;
  status?: 'running' | 'completed' | 'paused' | 'error';
}

export function AgentProgress({
  currentStep,
  stepNumber,
  totalSteps,
  percentage,
  estimatedTimeRemaining,
  details,
  status = 'running'
}: AgentProgressProps) {
  const statusConfig = {
    running: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Loader2,
      iconClass: 'animate-spin'
    },
    completed: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle,
      iconClass: ''
    },
    paused: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: Clock,
      iconClass: ''
    },
    error: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: AlertCircle,
      iconClass: ''
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl"
    >
      <Card className={`${config.bgColor} ${config.borderColor} border shadow-sm`}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${config.color} ${config.iconClass}`} />
            <div className="flex-1">
              <h3 className={`font-medium ${config.color}`}>
                Agent Progress
              </h3>
              <p className="text-sm text-gray-600">
                Step {stepNumber} of {totalSteps}
              </p>
            </div>
            <Badge variant="outline" className={config.color}>
              {percentage}%
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{stepNumber}/{totalSteps} steps completed</span>
              {estimatedTimeRemaining && (
                <span>{estimatedTimeRemaining} remaining</span>
              )}
            </div>
          </div>

          {/* Current Step */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Current Step:</h4>
            <p className="text-sm text-gray-700">{currentStep}</p>
            
            {details && (
              <div className="text-xs text-gray-500 bg-white/50 p-2 rounded border">
                {details}
              </div>
            )}
          </div>

          {/* Animated Dots for Running State */}
          {status === 'running' && (
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
              <span className="ml-2 text-xs text-blue-600">Processing...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AgentAnnouncementProps {
  planTitle: string;
  totalSteps: number;
  estimatedDuration: string;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresApproval: boolean;
  keyCapabilities: string[];
}

export function AgentAnnouncement({
  planTitle,
  totalSteps,
  estimatedDuration,
  complexity,
  requiresApproval,
  keyCapabilities
}: AgentAnnouncementProps) {
  const complexityColors = {
    simple: 'bg-green-100 text-green-800 border-green-200',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    complex: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl"
    >
      <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1] 
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity }
              }}
              className="text-2xl"
            >
              🤖
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Agent Mode Activated
              </h2>
              <p className="text-blue-700">
                Advanced multi-step processing enabled
              </p>
            </div>
          </div>

          {/* Plan Details */}
          <div className="bg-white/60 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Execution Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Task:</span>
                <p className="text-gray-600">{planTitle}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Duration:</span>
                <p className="text-gray-600">{estimatedDuration}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Steps:</span>
                <p className="text-gray-600">{totalSteps} operations</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Complexity:</span>
                <Badge className={complexityColors[complexity]}>
                  {complexity}
                </Badge>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Agent Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {keyCapabilities.map((capability, index) => (
                <motion.div
                  key={capability}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Badge variant="outline" className="text-xs bg-white/50">
                    {capability}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Approval Notice */}
          {requiresApproval && (
            <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  User Approval Required
                </span>
              </div>
              <p className="text-xs text-purple-700 mt-1">
                I'll request your confirmation before executing critical actions.
              </p>
            </div>
          )}

          {/* Ready Indicator */}
          <div className="flex items-center justify-center pt-2">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 text-blue-700"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Ready to begin execution</span>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}