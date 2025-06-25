'use client';

import type { UIMessage } from 'ai';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import { AgentPlan } from './agent-plan';
import { AgentProgress, AgentAnnouncement } from './agent-progress';
import { AgentDecision, AgentReasoning } from './agent-decision';
import AgentErrorRecovery from './agent-error-recovery';
import type { UseChatHelpers } from '@ai-sdk/react';

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {message.experimental_attachments &&
              message.experimental_attachments.length > 0 && (
                <div
                  data-testid={`message-attachments`}
                  className="flex flex-row justify-end gap-2"
                >
                  {message.experimental_attachments.map((attachment) => (
                    <PreviewAttachment
                      key={attachment.url}
                      attachment={attachment}
                    />
                  ))}
                </div>
              )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-2xl max-w-fit hover:shadow-md transition-shadow duration-200':
                            message.role === 'user',
                        })}
                      >
                        <Markdown>{sanitizeText(part.text)}</Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              // Handle URL sources (AI SDK 4.2+ feature)
              if (type === 'source') {
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  >
                    <span className="text-blue-600 font-medium">Source:</span>
                    <a
                      href={part.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 underline truncate"
                    >
                      {part.source.title || new URL(part.source.url).hostname}
                    </a>
                  </div>
                );
              }

              // Handle file generation (AI SDK 4.2+ feature)
              if (type === 'file') {
                if (part.mimeType?.startsWith('image/')) {
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <div className="text-sm text-gray-600">
                        Generated Image:
                      </div>
                      <img
                        src={`data:${part.mimeType};base64,${part.data}`}
                        alt="Generated image"
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      />
                    </div>
                  );
                }

                // Handle other file types
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg"
                  >
                    <div className="text-sm">
                      <div className="font-medium">Generated File</div>
                      <div className="text-gray-600">Type: {part.mimeType}</div>
                    </div>
                  </div>
                );
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? (
                        <Weather />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'announceAgentMode' ? (
                        <AgentAnnouncement {...args} />
                      ) : toolName === 'showProgress' ? (
                        <AgentProgress {...args} />
                      ) : toolName === 'requestDecision' ? (
                        <AgentDecision
                          {...args}
                          onDecision={() => {}}
                          disabled={true}
                        />
                      ) : toolName === 'explainReasoning' ? (
                        <AgentReasoning {...args} />
                      ) : toolName === 'handleError' ? (
                        <AgentErrorRecovery
                          {...args}
                          onRecovery={() => {}}
                          onSkip={() => {}}
                          onAbort={() => {}}
                          disabled={true}
                        />
                      ) : [
                          'planTask',
                          'executeStep',
                          'summarizeExecution',
                          'refinePlan',
                          'requestApproval',
                        ].includes(toolName) ? (
                        // Agent core tool execution display
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-purple-900">
                              🤖 Agent: {toolName}
                            </span>
                          </div>
                          <div className="text-sm text-purple-700">
                            {toolName === 'planTask' &&
                              'Creating detailed execution plan...'}
                            {toolName === 'executeStep' &&
                              'Executing step with reasoning...'}
                            {toolName === 'summarizeExecution' &&
                              'Generating comprehensive summary...'}
                            {toolName === 'refinePlan' &&
                              'Adapting plan based on new information...'}
                            {toolName === 'requestApproval' &&
                              'Requesting user approval...'}
                          </div>
                        </div>
                      ) : (
                        // Clean MCP tool execution display
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-semibold text-blue-900">
                              Using {toolName}
                            </span>
                          </div>
                          <div className="text-sm text-blue-700">
                            Executing tool with provided parameters...
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview
                          isReadonly={isReadonly}
                          result={result}
                        />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'planTask' && result?.plan ? (
                        <AgentPlan plan={result.plan} />
                      ) : toolName === 'provideSummary' ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-emerald-900">
                              🎯 Execution Summary
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded-lg border border-emerald-100">
                              <h4 className="font-medium text-emerald-900 mb-2">
                                {result.planTitle}
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-sm text-emerald-800">
                                <div>
                                  Status:{' '}
                                  <strong>{result.executionStatus}</strong>
                                </div>
                                <div>
                                  Success Rate:{' '}
                                  <strong>{result.successRate}%</strong>
                                </div>
                                <div>
                                  Completed:{' '}
                                  <strong>
                                    {result.completedSteps}/{result.totalSteps}
                                  </strong>
                                </div>
                                <div>
                                  Duration: <strong>{result.duration}</strong>
                                </div>
                              </div>
                            </div>
                            {result.keyResults?.length > 0 && (
                              <div className="space-y-2">
                                <h5 className="font-medium text-emerald-900">
                                  Key Results:
                                </h5>
                                <ul className="space-y-1 text-sm text-emerald-800">
                                  {result.keyResults.map(
                                    (outcome: string, i: number) => (
                                      <li
                                        key={i}
                                        className="flex items-start gap-2"
                                      >
                                        <span className="text-emerald-500 mt-1">
                                          ✓
                                        </span>
                                        {outcome}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : [
                          'executeStep',
                          'refinePlan',
                          'requestApproval',
                        ].includes(toolName) ? (
                        // Agent core tool result display
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-purple-900">
                              🤖 Agent: {toolName} completed
                            </span>
                          </div>
                          <div className="text-sm text-purple-800 bg-white p-3 rounded-lg border border-purple-100">
                            {result?.success ? (
                              <div className="space-y-2">
                                {result.reasoning && (
                                  <div>
                                    <strong>Reasoning:</strong>{' '}
                                    {result.reasoning}
                                  </div>
                                )}
                                {typeof result.result === 'string'
                                  ? result.result
                                  : result.message ||
                                    'Step completed successfully'}
                              </div>
                            ) : (
                              <div className="text-red-700">
                                {result?.error || 'Step failed'}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Clean MCP tool result display
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-green-900">
                              {toolName} completed
                            </span>
                          </div>
                          <div className="text-sm text-green-800 bg-white p-3 rounded-lg border border-green-100">
                            {typeof result === 'string'
                              ? result
                              : result?.content?.[0]?.text ||
                                'Task completed successfully'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const [dots, setDots] = useState('');

  // Animated thinking dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -5, opacity: 0 }}
      data-role="assistant"
    >
      <div className="flex gap-4 w-full">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="translate-y-px"
          >
            <SparklesIcon size={14} />
          </motion.div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Thinking</span>
            <span className="font-mono w-6 text-left">{dots}</span>
          </div>
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
