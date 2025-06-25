'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Edit3, 
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface AgentControlsProps {
  state: 'planning' | 'executing' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReplan?: () => void;
  onModifyPlan?: () => void;
  onConfigureAgent?: () => void;
  settings?: {
    autoApprove: boolean;
    showReasoningDetails: boolean;
    maxStepsWithoutApproval: number;
  };
  onSettingsChange?: (settings: any) => void;
  disabled?: boolean;
}

export function AgentControls({
  state,
  currentStep,
  totalSteps = 0,
  completedSteps = 0,
  onPlay,
  onPause,
  onStop,
  onReplan,
  onModifyPlan,
  onConfigureAgent,
  settings = {
    autoApprove: false,
    showReasoningDetails: true,
    maxStepsWithoutApproval: 3,
  },
  onSettingsChange,
  disabled = false
}: AgentControlsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const stateConfig = {
    planning: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Planning',
      canPlay: true,
      canPause: false,
      canStop: false,
    },
    executing: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Executing',
      canPlay: false,
      canPause: true,
      canStop: true,
    },
    waiting: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Waiting for Input',
      canPlay: true,
      canPause: false,
      canStop: true,
    },
    completed: {
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      label: 'Completed',
      canPlay: false,
      canPause: false,
      canStop: false,
    },
    failed: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Failed',
      canPlay: false,
      canPause: false,
      canStop: false,
    },
    cancelled: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      label: 'Cancelled',
      canPlay: false,
      canPause: false,
      canStop: false,
    },
  };

  const config = stateConfig[state];
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleSettingChange = (key: string, value: any) => {
    if (onSettingsChange) {
      onSettingsChange({
        ...settings,
        [key]: value,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl"
    >
      <Card className={`${config.bgColor} ${config.borderColor} border shadow-sm`}>
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg">🤖</div>
              <div>
                <h3 className={`font-medium ${config.color}`}>Agent Controls</h3>
                <p className="text-sm text-gray-600">Status: {config.label}</p>
              </div>
              {state === 'executing' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"
                />
              )}
            </div>
            <Badge className={`${config.color} bg-white border`}>
              {totalSteps > 0 && `${completedSteps}/${totalSteps} steps`}
            </Badge>
          </div>

          {/* Progress Bar */}
          {totalSteps > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full ${config.color.replace('text-', 'bg-')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress: {Math.round(progress)}%</span>
                {currentStep && <span>Current: {currentStep}</span>}
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {config.canPlay && (
              <Button
                onClick={onPlay}
                disabled={disabled}
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {state === 'waiting' ? 'Resume' : 'Start'}
              </Button>
            )}

            {config.canPause && (
              <Button
                onClick={onPause}
                disabled={disabled}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}

            {config.canStop && (
              <Button
                onClick={onStop}
                disabled={disabled}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
            )}

            <Separator orientation="vertical" className="h-8" />

            <Button
              onClick={onReplan}
              disabled={disabled || state === 'executing'}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Replan
            </Button>

            <Button
              onClick={onModifyPlan}
              disabled={disabled || state === 'executing'}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Modify
            </Button>
          </div>

          <Separator />

          {/* Settings Panel */}
          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full flex items-center justify-between p-2 hover:bg-white/50"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Agent Settings</span>
                </div>
                {isSettingsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <AnimatePresence>
              {isSettingsOpen && (
                <CollapsibleContent asChild>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/50 rounded-lg p-3 space-y-4 mt-2">
                      {/* Auto Approval */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="auto-approve" className="text-sm font-medium">
                            Auto-approve actions
                          </Label>
                          <p className="text-xs text-gray-500">
                            Automatically approve non-destructive operations
                          </p>
                        </div>
                        <Switch
                          id="auto-approve"
                          checked={settings.autoApprove}
                          onCheckedChange={(checked) => handleSettingChange('autoApprove', checked)}
                          disabled={disabled}
                        />
                      </div>

                      {/* Show Reasoning */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="show-reasoning" className="text-sm font-medium">
                            Show detailed reasoning
                          </Label>
                          <p className="text-xs text-gray-500">
                            Display agent's thought process for each step
                          </p>
                        </div>
                        <Switch
                          id="show-reasoning"
                          checked={settings.showReasoningDetails}
                          onCheckedChange={(checked) => handleSettingChange('showReasoningDetails', checked)}
                          disabled={disabled}
                        />
                      </div>

                      {/* Max Steps Warning */}
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-800">
                          Agent will request approval after {settings.maxStepsWithoutApproval} consecutive steps
                        </span>
                      </div>

                      {/* Advanced Settings Button */}
                      <Button
                        onClick={onConfigureAgent}
                        disabled={disabled}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        Advanced Configuration
                      </Button>
                    </div>
                  </motion.div>
                </CollapsibleContent>
              )}
            </AnimatePresence>
          </Collapsible>

          {/* Status Indicators */}
          {(state === 'failed' || state === 'completed') && (
            <div className={`
              flex items-center gap-2 p-2 rounded-lg border
              ${state === 'failed' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-green-50 border-green-200 text-green-800'
              }
            `}>
              {state === 'failed' ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Execution failed. Check logs for details.</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">All steps completed successfully!</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AgentControls;