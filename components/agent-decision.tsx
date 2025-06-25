'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, HelpCircle, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface DecisionOption {
  value: string;
  label: string;
  description?: string;
}

interface AgentDecisionProps {
  decision: string;
  context: string;
  options: DecisionOption[];
  defaultOption?: string;
  consequences?: string;
  onDecision: (value: string) => void;
  disabled?: boolean;
}

export function AgentDecision({
  decision,
  context,
  options,
  defaultOption,
  consequences,
  onDecision,
  disabled = false
}: AgentDecisionProps) {
  const [selectedOption, setSelectedOption] = useState<string>(defaultOption || options[0]?.value || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedOption || disabled) return;
    
    setIsSubmitting(true);
    try {
      await onDecision(selectedOption);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOptionDetails = options.find(opt => opt.value === selectedOption);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl"
    >
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <HelpCircle className="w-6 h-6 text-purple-600 mt-0.5" />
            <div className="space-y-2">
              <CardTitle className="text-lg text-purple-900">
                Agent Decision Required
              </CardTitle>
              <p className="text-sm text-purple-700">{decision}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Context */}
          <div className="bg-white/60 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Context
            </h4>
            <p className="text-sm text-gray-700">{context}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Choose an option:</h4>
            <div className="space-y-2">
              {options.map((option, index) => (
                <motion.div
                  key={option.value}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    cursor-pointer rounded-lg border-2 p-3 transition-all duration-200
                    ${selectedOption === option.value 
                      ? 'border-purple-300 bg-purple-100' 
                      : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={() => !disabled && setSelectedOption(option.value)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-4 h-4 rounded-full border-2 mt-0.5 transition-colors
                      ${selectedOption === option.value 
                        ? 'border-purple-600 bg-purple-600' 
                        : 'border-gray-300'
                      }
                    `}>
                      {selectedOption === option.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 bg-white rounded-full m-0.5"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{option.label}</h5>
                      {option.description && (
                        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                      )}
                      {option.value === defaultOption && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Selected Option Details */}
          {selectedOptionDetails?.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-medium text-blue-900 mb-1">Selected Option Details:</h5>
              <p className="text-sm text-blue-800">{selectedOptionDetails.description}</p>
            </div>
          )}

          {/* Consequences */}
          {consequences && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-amber-900">Important:</h5>
                  <p className="text-sm text-amber-800">{consequences}</p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedOption && (
                <span>Selected: <strong>{selectedOptionDetails?.label}</strong></span>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!selectedOption || disabled || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Processing...
                </>
              ) : (
                <>
                  Confirm Decision
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AgentReasoningProps {
  stepTitle: string;
  reasoning: string;
  factors: string[];
  alternatives?: string[];
  confidence: number;
  risks?: string[];
}

export function AgentReasoning({
  stepTitle,
  reasoning,
  factors,
  alternatives = [],
  confidence,
  risks = []
}: AgentReasoningProps) {
  const confidenceColor = confidence >= 0.8 ? 'text-green-600' : 
                         confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600';
  
  const confidenceLabel = confidence >= 0.8 ? 'High' : 
                         confidence >= 0.6 ? 'Medium' : 'Low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl"
    >
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="text-lg">💭</div>
            <div>
              <h4 className="font-medium text-blue-900">Agent Reasoning</h4>
              <p className="text-sm text-blue-700">{stepTitle}</p>
            </div>
            <div className="ml-auto">
              <Badge className={`${confidenceColor} bg-white`}>
                {confidenceLabel} Confidence ({Math.round(confidence * 100)}%)
              </Badge>
            </div>
          </div>

          {/* Main Reasoning */}
          <div className="bg-white/60 rounded p-3">
            <p className="text-sm text-gray-800">{reasoning}</p>
          </div>

          {/* Factors */}
          {factors.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900">Key Factors:</h5>
              <ul className="space-y-1">
                {factors.map((factor, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="text-sm text-gray-700 flex items-start gap-2"
                  >
                    <span className="text-blue-500 mt-1">•</span>
                    {factor}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900">Alternatives Considered:</h5>
              <ul className="space-y-1">
                {alternatives.map((alt, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400 mt-1">→</span>
                    {alt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {risks.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
              <h5 className="font-medium text-yellow-900 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Identified Risks:
              </h5>
              <ul className="space-y-1">
                {risks.map((risk, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">⚠</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}