'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  RefreshCw, 
  SkipForward, 
  PlayCircle, 
  XCircle,
  Info,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface RecoveryOption {
  strategy: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
}

interface AgentErrorRecoveryProps {
  errorType: string;
  errorMessage: string;
  failedStep: string;
  recoveryOptions: RecoveryOption[];
  skipPossible: boolean;
  criticalFailure: boolean;
  onRecovery: (strategy: string) => void;
  onSkip?: () => void;
  onAbort?: () => void;
  disabled?: boolean;
}

export function AgentErrorRecovery({
  errorType,
  errorMessage,
  failedStep,
  recoveryOptions,
  skipPossible,
  criticalFailure,
  onRecovery,
  onSkip,
  onAbort,
  disabled = false
}: AgentErrorRecoveryProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const likelihoodColors = {
    low: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-green-100 text-green-800 border-green-200',
  };

  const handleRecovery = async (strategy: string) => {
    if (disabled) return;
    
    setIsProcessing(true);
    try {
      await onRecovery(strategy);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!skipPossible || !onSkip || disabled) return;
    
    setIsProcessing(true);
    try {
      await onSkip();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAbort = async () => {
    if (!onAbort || disabled) return;
    
    setIsProcessing(true);
    try {
      await onAbort();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl"
    >
      <Card className={`border-red-300 shadow-md ${criticalFailure ? 'bg-red-50' : 'bg-orange-50'}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${criticalFailure ? 'bg-red-100' : 'bg-orange-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${criticalFailure ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            <div className="space-y-2">
              <CardTitle className={`text-lg ${criticalFailure ? 'text-red-900' : 'text-orange-900'}`}>
                {criticalFailure ? '🚨 Critical Error' : '⚠️ Step Failed'}
              </CardTitle>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <strong>Failed Step:</strong> {failedStep}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Error Type:</strong> {errorType}
                </p>
              </div>
            </div>
            {criticalFailure && (
              <Badge variant="destructive" className="ml-auto">
                Critical
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Details */}
          <div className="bg-white/60 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Error Details
            </h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border font-mono">
              {errorMessage}
            </p>
          </div>

          {/* Recovery Options */}
          {recoveryOptions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recovery Options:</h4>
              <div className="space-y-2">
                {recoveryOptions.map((option, index) => (
                  <motion.div
                    key={option.strategy}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      cursor-pointer rounded-lg border-2 p-3 transition-all duration-200
                      ${selectedStrategy === option.strategy 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !disabled && setSelectedStrategy(option.strategy)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{option.strategy}</h5>
                          <Badge className={likelihoodColors[option.likelihood]}>
                            {option.likelihood} success
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                      <div className={`
                        w-4 h-4 rounded-full border-2 mt-1 transition-colors
                        ${selectedStrategy === option.strategy 
                          ? 'border-blue-600 bg-blue-600' 
                          : 'border-gray-300'
                        }
                      `}>
                        {selectedStrategy === option.strategy && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 bg-white rounded-full m-0.5"
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {skipPossible && (
                <Button
                  onClick={handleSkip}
                  disabled={disabled || isProcessing}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip Step
                </Button>
              )}

              <Button
                onClick={handleAbort}
                disabled={disabled || isProcessing}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <XCircle className="w-4 h-4" />
                Abort Execution
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {selectedStrategy && (
                <Button
                  onClick={() => handleRecovery(selectedStrategy)}
                  disabled={disabled || isProcessing || !selectedStrategy}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Attempting Recovery...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Recovery
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Critical Failure Warning */}
          {criticalFailure && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-medium text-red-900">Critical Failure Detected</h5>
                  <p className="text-sm text-red-800">
                    This error prevents the agent from continuing safely. Manual intervention may be required.
                  </p>
                  <p className="text-xs text-red-700">
                    Consider reviewing the execution plan or aborting the current operation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected Strategy Info */}
          {selectedStrategy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-medium text-blue-900 mb-1">
                Selected Recovery Strategy: {selectedStrategy}
              </h5>
              <p className="text-sm text-blue-800">
                {recoveryOptions.find(opt => opt.strategy === selectedStrategy)?.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AgentErrorRecovery;