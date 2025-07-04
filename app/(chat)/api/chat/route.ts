import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { AISDKExporter } from 'langsmith/vercel';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  getMemoriesByUserId,
  getUserMemorySettings,
  getUploadedFilesByUrls,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment, isTestEnvironment } from '@/lib/constants';
import { myProvider, availableModels } from '@/lib/ai/providers';
import { isReasoningModel, hasBuiltInReasoning } from '@/lib/ai/models';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { mcpClientManager } from '@/lib/ai/mcp-client';
import { getEnabledMcpServersByUserId } from '@/lib/db/queries';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';
import { processMemoryForUser } from '@/lib/ai/memory-classifier';
import { AgentCore, createAgentTools } from '@/lib/ai/agent';
import {
  agentCommunicationTools,
  agentCommunicationToolNames,
} from '@/lib/ai/tools/agent-communication';

export const maxDuration = 30;

// Agent mode detection utilities
function detectAgentMode(message: any, messages: any[]): boolean {
  const userText =
    message.parts
      ?.filter((part: any) => part.type === 'text')
      ?.map((part: any) => part.text)
      ?.join(' ')
      ?.toLowerCase() || '';

  // Multi-step indicators
  const multiStepKeywords = [
    'step by step',
    'break down',
    'analyze and',
    'first.*then',
    'plan.*execute',
    'multiple.*steps',
    'comprehensive.*approach',
    'detailed.*process',
    'implement.*strategy',
    'build.*from.*scratch',
    'create.*complete',
    'design.*and.*implement',
    'research.*and.*develop',
    'analyze.*optimize',
    'troubleshoot.*and.*fix',
    'audit.*and.*improve',
    'review.*and.*refactor',
  ];

  // Complex task indicators
  const complexityKeywords = [
    'complex',
    'architecture',
    'system.*design',
    'integration',
    'optimization',
    'performance.*analysis',
    'security.*audit',
    'comprehensive.*review',
    'full.*implementation',
    'end.*to.*end',
    'complete.*solution',
  ];

  // Tool coordination indicators
  const toolCoordinationKeywords = [
    'using.*multiple.*tools',
    'combine.*tools',
    'coordinate.*between',
    'integrate.*with',
    'use.*together',
    'leverage.*various',
  ];

  // Check for patterns
  const hasMultiStep = multiStepKeywords.some((keyword) =>
    new RegExp(keyword, 'i').test(userText),
  );

  const hasComplexity = complexityKeywords.some((keyword) =>
    new RegExp(keyword, 'i').test(userText),
  );

  const hasToolCoordination = toolCoordinationKeywords.some((keyword) =>
    new RegExp(keyword, 'i').test(userText),
  );

  // Check for conjunctions that suggest multiple steps
  const hasConjunctions =
    /\b(and\s+then|after\s+that|next\s+step|following\s+that|subsequently|additionally|furthermore|moreover)\b/i.test(
      userText,
    );

  // Check for numbered lists or bullet points
  const hasNumberedSteps = /\b(\d+[\.\)]|\w+\s*[\.\)])\s*[A-Z]/.test(userText);

  // Check message length (longer messages often require more complex handling)
  const isLongMessage = userText.length > 200;

  // Check conversation context for complexity buildup
  const hasComplexContext = messages.length > 3;

  // Scoring system
  let agentScore = 0;
  if (hasMultiStep) agentScore += 3;
  if (hasComplexity) agentScore += 2;
  if (hasToolCoordination) agentScore += 2;
  if (hasConjunctions) agentScore += 1;
  if (hasNumberedSteps) agentScore += 2;
  if (isLongMessage) agentScore += 1;
  if (hasComplexContext) agentScore += 1;

  return agentScore >= 3;
}

function analyzeComplexity(message: any): 'simple' | 'moderate' | 'complex' {
  const userText =
    message.parts
      ?.filter((part: any) => part.type === 'text')
      ?.map((part: any) => part.text)
      ?.join(' ')
      ?.toLowerCase() || '';

  const complexIndicators = [
    'architecture',
    'system',
    'integration',
    'comprehensive',
    'complete solution',
  ];
  const moderateIndicators = [
    'analyze',
    'implement',
    'create',
    'design',
    'build',
  ];

  if (complexIndicators.some((ind) => userText.includes(ind))) return 'complex';
  if (moderateIndicators.some((ind) => userText.includes(ind)))
    return 'moderate';
  return 'simple';
}

// Removed complex provider switching - all files are now parsed as text

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  console.log('🔄 Stream Context: Attempting to get stream context...');

  if (!globalStreamContext) {
    // Check if REDIS_URL is available
    if (!process.env.REDIS_URL) {
      console.log(
        '⚠️ Stream Context: REDIS_URL not found, skipping resumable streams',
      );
      return null;
    }

    console.log('🔄 Stream Context: Creating new resumable stream context...');
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
      console.log(
        '✅ Stream Context: Successfully created resumable stream context',
      );
    } catch (error: any) {
      console.error(
        '❌ Stream Context: Failed to create resumable stream context:',
        error,
      );
      if (
        error.message.includes('REDIS_URL') ||
        error.code === 'ERR_INVALID_URL' ||
        error.message.includes('Invalid URL')
      ) {
        console.log(
          '⚠️ Resumable streams are disabled due to invalid or missing REDIS_URL',
        );
      } else {
        console.error('❌ Stream Context: Unexpected error:', error);
      }
      // Return null to use regular streaming instead
      return null;
    }
  } else {
    console.log('✅ Stream Context: Using existing stream context');
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  console.log('🔄 Chat API: Starting request processing...');

  // Environment checks for debugging
  console.log('🔧 Chat API: Environment check:', {
    nodeEnv: process.env.NODE_ENV,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    hasRedisUrl: !!process.env.REDIS_URL,
    isProduction: isProductionEnvironment,
    isTest: isTestEnvironment,
  });

  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    console.log('📝 Chat API: Raw request data received:', {
      hasId: !!json.id,
      hasMessage: !!json.message,
      messagePartsLength: json.message?.parts?.length || 0,
      messageAttachmentsLength:
        json.message?.experimental_attachments?.length || 0,
      selectedChatModel: json.selectedChatModel,
      selectedVisibilityType: json.selectedVisibilityType,
    });

    requestBody = postRequestBodySchema.parse(json);
    console.log('✅ Chat API: Request body validation passed');
  } catch (error) {
    console.error('❌ Chat API: Request validation failed:', error);
    if (error instanceof Error) {
      console.error('❌ Chat API: Validation error details:', error.message);
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    console.log('🤖 Chat API: Processing with model:', selectedChatModel);

    const session = await auth();

    if (!session?.user) {
      console.error('❌ Chat API: No authenticated session found');
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    console.log('✅ Chat API: User authenticated:', {
      userId: session.user.id,
      userType: session.user.type,
    });

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    console.log('📊 Chat API: Message count check:', {
      messageCount,
      maxAllowed: entitlementsByUserType[userType].maxMessagesPerDay,
      userType,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      console.error('❌ Chat API: Rate limit exceeded');
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      console.log('🆕 Chat API: Creating new chat...');
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      console.log('✅ Chat API: New chat created with title:', title);
    } else {
      console.log('✅ Chat API: Using existing chat:', {
        chatId: id,
        title: chat.title,
      });

      if (chat.userId !== session.user.id) {
        console.error('❌ Chat API: User does not own this chat');
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id });
    console.log(
      '📨 Chat API: Previous messages loaded:',
      previousMessages.length,
    );

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    console.log('📨 Chat API: Total messages for context:', messages.length);

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    console.log('🌍 Chat API: Location context:', {
      city,
      country,
      hasCoordinates: !!(longitude && latitude),
    });

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    console.log('✅ Chat API: User message saved to database');

    // Get user memories and settings for context
    const [userMemories, userMemorySettings] = await Promise.all([
      getMemoriesByUserId({ userId: session.user.id, limit: 50 }), // Recent memories for context
      getUserMemorySettings({ userId: session.user.id }),
    ]);

    // Format memories for system prompt
    const memoriesContext =
      userMemories.length > 0
        ? userMemories
            .map((memory) => `[${memory.category}] ${memory.content}`)
            .join('\n- ')
        : undefined;

    console.log('🧠 Chat API: Memory context:', {
      memoriesCount: userMemories.length,
      memoryCollectionEnabled:
        userMemorySettings?.memoryCollectionEnabled !== false,
    });

    // Get file context from attachments and prepare for AI model
    let attachedFilesContext: string | undefined;
    const fileAttachments: any[] = [];

    if (
      message.experimental_attachments &&
      message.experimental_attachments.length > 0
    ) {
      console.log('🔄 Processing file attachments for AI context...');

      try {
        const attachmentUrls = message.experimental_attachments.map(
          (att) => att.url,
        );
        const uploadedFiles = await getUploadedFilesByUrls({
          urls: attachmentUrls,
        });

        if (uploadedFiles.length > 0) {
          console.log(
            `📁 Found ${uploadedFiles.length} uploaded files for context`,
          );

          const fileContexts: string[] = [];

          for (const file of uploadedFiles) {
            const extension = file.fileName.split('.').pop()?.toLowerCase();

            // Find the corresponding attachment
            const attachment = message.experimental_attachments?.find(
              (att) => att.url === file.fileUrl,
            );

            if (file.parsedContent && file.parsingStatus === 'completed') {
              // For all parsed files (including PDFs), include content in context
              const content = file.parsedContent || '';
              const contentPreview =
                content.length > 500000
                  ? `${content.substring(0, 500000)}...\n[Content truncated - full ${content.length} characters available]`
                  : content;
              fileContexts.push(
                `📄 ${file.fileName} (${Math.round(file.fileSize / 1024)}KB):\n${contentPreview}`,
              );
            } else if (attachment?.contentType?.startsWith('image/')) {
              // Only add images as attachments since AI SDK handles them automatically
              fileAttachments.push({
                name: file.fileName,
                url: file.fileUrl,
                contentType: file.mimeType || attachment.contentType,
              });
              fileContexts.push(
                `🖼️ Image: ${file.fileName} (${Math.round(file.fileSize / 1024)}KB) - Available for visual analysis`,
              );
            }
          }

          if (fileContexts.length > 0) {
            attachedFilesContext = fileContexts.join(
              '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n',
            );
            console.log(
              `✅ Prepared context for ${fileContexts.length} files (${fileAttachments.length} as attachments)`,
            );
          }
        }
      } catch (error) {
        console.error('❌ Failed to process file attachments:', error);
      }
    }

    // Process memory collection in background (don't await)
    if (userMemorySettings?.memoryCollectionEnabled !== false) {
      // Extract text content from message parts for memory processing
      const messageText = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(' ');

      if (messageText.trim()) {
        after(() =>
          processMemoryForUser(session.user.id, messageText, message.id).catch(
            (error) =>
              console.error('❌ Background memory processing failed:', error),
          ),
        );
      }
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    console.log('🆔 Chat API: Stream ID created:', streamId);

    // All files are now parsed as text content, so no need for provider switching

    // Verify provider model exists
    console.log('🔍 Chat API: Checking model availability...', {
      requestedModel: selectedChatModel,
      isModelAvailable: availableModels.includes(selectedChatModel),
      availableModelsCount: availableModels.length,
    });

    if (!availableModels.includes(selectedChatModel)) {
      console.error(
        '❌ Chat API: Requested model not in available models list:',
        {
          requestedModel: selectedChatModel,
          availableModels: availableModels.slice(0, 10), // Show first 10 for brevity
        },
      );
    }

    try {
      const languageModel = myProvider.languageModel(selectedChatModel);
      console.log(
        '✅ Chat API: Language model acquired successfully for:',
        selectedChatModel,
      );
    } catch (error) {
      console.error(
        '❌ Chat API: Failed to get language model for:',
        selectedChatModel,
        error,
      );
      console.error('❌ Chat API: Available models:', availableModels);
      throw error;
    }

    // Agent mode detection - determine if request requires multi-step processing
    const requiresAgent = detectAgentMode(message, messages);
    const useAgentMode = requiresAgent && !isReasoningModel(selectedChatModel);

    console.log('🤖 Agent Detection:', {
      requiresAgent,
      useAgentMode,
      complexity: requiresAgent ? analyzeComplexity(message) : 'simple',
    });

    // Get agent tools if in agent mode
    const agentTools = useAgentMode
      ? { ...createAgentTools(), ...agentCommunicationTools }
      : {};
    const agentToolNames = useAgentMode
      ? [...Object.keys(createAgentTools()), ...agentCommunicationToolNames]
      : [];

    // Log context for debugging
    console.log('🤖 AI Context Summary:');
    console.log(`   - Model: ${selectedChatModel}`);
    console.log(`   - Memories: ${memoriesContext ? 'Yes' : 'No'}`);
    console.log(
      `   - Files: ${fileAttachments.length} attachments, ${attachedFilesContext ? 'Yes' : 'No'} context`,
    );
    console.log(
      `   - File context length: ${attachedFilesContext?.length || 0} chars`,
    );
    console.log(`   - Messages in context: ${messages.length}`);
    const maxSteps = useAgentMode ? 15 : 5; // More steps for agent mode
    console.log(
      `   - Max steps: ${maxSteps} ${useAgentMode ? '(Agent mode)' : '(Standard mode)'}`,
    );
    console.log(
      `   - Tools enabled: ${!isReasoningModel(selectedChatModel) ? 'Yes' : 'No (reasoning model)'}`,
    );
    if (useAgentMode) {
      console.log(`   - Agent tools: ${agentToolNames.join(', ')}`);
    }

    if (hasBuiltInReasoning(selectedChatModel)) {
      console.log('   - Reasoning summaries: Enabled (detailed)');
      console.log('   - Reasoning effort: Medium');
    }

    // Get MCP tools for the user (with timeout optimization)
    let mcpTools: Record<string, any> = {};
    let mcpToolNames: string[] = [];

    if (!isReasoningModel(selectedChatModel)) {
      try {
        console.log('🔧 Chat API: Loading MCP tools (optimized)...');

        // Set a shorter timeout for MCP operations to avoid blocking chat
        const mcpTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MCP timeout')), 2000),
        );

        const mcpOperation = async () => {
          // Get enabled MCP servers for the user
          const enabledServers = await getEnabledMcpServersByUserId({
            userId: session.user.id,
          });

          // Skip MCP setup if no servers to avoid delay
          if (enabledServers.length === 0) {
            return { tools: {}, names: [] };
          }

          console.log(`🔧 Found ${enabledServers.length} enabled MCP servers`);

          // Check for already connected clients first
          let tools = await mcpClientManager.getAllTools();
          let names = Object.keys(tools);

          if (names.length > 0) {
            console.log(`✅ Using ${names.length} already available MCP tools`);
            return { tools, names };
          }

          // Initialize servers and wait for connection
          const initPromises = enabledServers.map(async (server) => {
            let client = mcpClientManager.getClient(server.id);

            if (!client) {
              try {
                const transport =
                  server.transportType === 'stdio'
                    ? {
                        type: 'stdio' as const,
                        command: server.command!,
                        args: server.args || undefined,
                        env: server.env || undefined,
                      }
                    : {
                        type: 'sse' as const,
                        url: server.url!,
                      };

                await mcpClientManager.addServer(server.id, {
                  transport,
                  timeout: Math.min(server.timeout || 5000, 3000), // Cap at 3s for chat
                  maxRetries: 0,
                  retryDelay: server.retryDelay,
                });

                client = mcpClientManager.getClient(server.id);
              } catch (error) {
                console.warn(`Failed to add MCP server ${server.id}:`, error);
                return;
              }
            }

            // Try to connect with timeout
            if (client && !client.isConnected()) {
              try {
                await Promise.race([
                  client.connect(),
                  new Promise((_, reject) =>
                    setTimeout(
                      () => reject(new Error('Connect timeout')),
                      2000,
                    ),
                  ),
                ]);
                console.log(`✅ Connected to MCP server: ${server.name}`);
              } catch (error) {
                console.warn(
                  `Failed to connect to MCP server ${server.name}:`,
                  error,
                );
              }
            }
          });

          await Promise.allSettled(initPromises);

          // Get available tools after connection attempts
          tools = await mcpClientManager.getAllTools();
          names = Object.keys(tools);

          return { tools, names };
        };

        const result = await Promise.race([mcpOperation(), mcpTimeout]);
        mcpTools = result.tools;
        mcpToolNames = result.names;

        console.log(
          `✅ Chat API: Loaded ${mcpToolNames.length} MCP tools (fast)`,
        );
        if (mcpToolNames.length > 0) {
          console.log(`   - Available tools: ${mcpToolNames.join(', ')}`);
        }
      } catch (error) {
        // Fast fail - don't block chat for MCP issues
        console.log(
          `⚡ Chat API: MCP tools skipped (${error instanceof Error ? error.message : 'unknown error'}) - proceeding`,
        );
      }
    }

    console.log('🚀 Chat API: Creating data stream...');

    const stream = createDataStream({
      execute: (dataStream) => {
        console.log('🔄 Stream Execute: Starting streamText...');

        try {
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({
              selectedChatModel,
              requestHints,
              memories: memoriesContext,
              attachedFiles: attachedFilesContext,
              useAgentMode,
            }),
            messages,
            ...(fileAttachments.length > 0 && {
              experimental_attachments: fileAttachments,
            }),
            maxSteps,
            experimental_activeTools: isReasoningModel(selectedChatModel)
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                  ...agentToolNames,
                  ...mcpToolNames,
                ],
            experimental_transform: smoothStream({ chunking: 'line' }),
            experimental_generateMessageId: generateUUID,
            // Add reasoning configuration for o3 models
            ...(hasBuiltInReasoning(selectedChatModel) && {
              providerOptions: {
                openai: {
                  reasoningSummary: 'detailed', // Enable detailed reasoning summaries
                  reasoningEffort: 'medium', // Balanced reasoning effort
                },
              },
            }),
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
              ...agentTools,
              ...mcpTools,
            },
            onFinish: async ({ response }) => {
              console.log('✅ Stream Execute: onFinish called');
              console.log('📊 Stream Execute: Response summary:', {
                messageCount: response.messages.length,
              });

              if (session.user?.id) {
                try {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    console.error(
                      '❌ Stream Execute: No assistant message found!',
                    );
                    throw new Error('No assistant message found!');
                  }

                  console.log(
                    '💾 Stream Execute: Saving assistant message with ID:',
                    assistantId,
                  );

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [message],
                    responseMessages: response.messages,
                  });

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts,
                        attachments:
                          assistantMessage.experimental_attachments ?? [],
                        createdAt: new Date(),
                      },
                    ],
                  });

                  console.log(
                    '✅ Stream Execute: Assistant message saved successfully',
                  );
                } catch (error) {
                  console.error(
                    '❌ Stream Execute: Failed to save chat:',
                    error,
                  );
                }
              }
            },
            experimental_telemetry: AISDKExporter.getSettings({
              runName: `chat-${selectedChatModel}`,
              metadata: {
                userId: session.user.id,
                chatId: id,
                userType: session.user.type,
                model: selectedChatModel,
                hasAttachments: fileAttachments.length > 0,
                attachmentCount: fileAttachments.length,
                attachmentFiles: fileAttachments
                  .map((att) => att.name)
                  .join(', '),
                hasFileContext: !!attachedFilesContext,
                fileContextLength: attachedFilesContext?.length || 0,
              },
            }),
          });

          console.log('✅ Stream Execute: streamText result created');

          result.consumeStream();
          console.log('✅ Stream Execute: consumeStream() called');

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
            sendSources: true,
          });
          console.log('✅ Stream Execute: mergeIntoDataStream() called');
        } catch (error) {
          console.error('❌ Stream Execute: Error in streamText:', error);
          throw error;
        }
      },
      onError: (error) => {
        console.error('❌ Data Stream: onError triggered:', error);
        return 'Oops, an error occurred!';
      },
    });

    console.log('✅ Chat API: Data stream created successfully');

    const streamContext = getStreamContext();

    if (streamContext) {
      console.log('🔄 Chat API: Using resumable stream...');
      try {
        const resumableStreamResponse = await streamContext.resumableStream(
          streamId,
          () => stream,
        );
        console.log('✅ Chat API: Resumable stream created successfully');
        return new Response(resumableStreamResponse);
      } catch (error) {
        console.error('❌ Chat API: Failed to create resumable stream:', error);
        console.log('🔄 Chat API: Falling back to regular stream...');
        return new Response(stream);
      }
    } else {
      console.log(
        '🔄 Chat API: Using regular stream (no resumable context)...',
      );
      return new Response(stream);
    }
  } catch (error) {
    console.error('❌ Chat API: Caught error in main try block:', error);
    if (error instanceof ChatSDKError) {
      console.error('❌ Chat API: ChatSDKError:', error.message);
      return error.toResponse();
    }
    console.error('❌ Chat API: Unexpected error:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
