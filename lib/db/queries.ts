import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  memory,
  type Memory,
  uploadedFile,
  mcpServer,
  mcpTool,
  mcpToolExecution,
  type McpServer,
  type McpTool,
  type McpToolExecution,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Memory-related queries
export async function saveMemory({
  userId,
  content,
  category,
  tags = [],
  originalMessage,
  originalMessageId,
}: {
  userId: string;
  content: string;
  category: string;
  tags?: string[];
  originalMessage?: string;
  originalMessageId?: string;
}) {
  try {
    const [savedMemory] = await db
      .insert(memory)
      .values({
        userId,
        content,
        category,
        tags,
        originalMessage,
        originalMessageId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return savedMemory;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save memory');
  }
}

export async function getMemoriesByUserId({
  userId,
  limit = 100,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(memory)
      .where(eq(memory.userId, userId))
      .orderBy(desc(memory.updatedAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get memories by user id',
    );
  }
}

export async function getMemoryById({ id }: { id: string }) {
  try {
    const [selectedMemory] = await db
      .select()
      .from(memory)
      .where(eq(memory.id, id));
    return selectedMemory;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get memory by id',
    );
  }
}

export async function updateMemory({
  id,
  content,
  category,
  tags,
}: {
  id: string;
  content?: string;
  category?: string;
  tags?: string[];
}) {
  try {
    const updateData: Partial<Memory> = {
      updatedAt: new Date(),
    };

    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;

    const [updatedMemory] = await db
      .update(memory)
      .set(updateData)
      .where(eq(memory.id, id))
      .returning();
    return updatedMemory;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update memory');
  }
}

export async function deleteMemory({ id }: { id: string }) {
  try {
    const [deletedMemory] = await db
      .delete(memory)
      .where(eq(memory.id, id))
      .returning();
    return deletedMemory;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete memory');
  }
}

export async function getMemoryCountByUserId({ userId }: { userId: string }) {
  try {
    const [stats] = await db
      .select({ count: count(memory.id) })
      .from(memory)
      .where(eq(memory.userId, userId))
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get memory count by user id',
    );
  }
}

export async function getUserMemorySettings({ userId }: { userId: string }) {
  try {
    const [userSettings] = await db
      .select({ memoryCollectionEnabled: user.memoryCollectionEnabled })
      .from(user)
      .where(eq(user.id, userId));
    return userSettings;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user memory settings',
    );
  }
}

export async function updateUserMemorySettings({
  userId,
  memoryCollectionEnabled,
}: {
  userId: string;
  memoryCollectionEnabled: boolean;
}) {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({ memoryCollectionEnabled })
      .where(eq(user.id, userId))
      .returning({ memoryCollectionEnabled: user.memoryCollectionEnabled });
    return updatedUser;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update user memory settings',
    );
  }
}

export async function searchMemories({
  userId,
  searchTerm,
  category,
  tags,
  limit = 50,
}: {
  userId: string;
  searchTerm?: string;
  category?: string;
  tags?: string[];
  limit?: number;
}) {
  try {
    const conditions = [eq(memory.userId, userId)];

    if (category) {
      conditions.push(eq(memory.category, category));
    }

    // For simplicity, we'll do a basic text search
    // In production, you might want to use full-text search or vector search
    return await db
      .select()
      .from(memory)
      .where(and(...conditions))
      .orderBy(desc(memory.updatedAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to search memories');
  }
}

export async function getChatIdFromMemoryMessage({
  originalMessageId,
}: {
  originalMessageId: string;
}) {
  try {
    const messageResults = await getMessageById({ id: originalMessageId });
    if (messageResults && messageResults.length > 0) {
      return messageResults[0].chatId;
    }
    return null;
  } catch (error) {
    console.error('Failed to get chat ID from memory message:', error);
    return null;
  }
}

// Uploaded File queries
export async function saveUploadedFile({
  userId,
  fileName,
  fileType,
  fileSize,
  fileUrl,
  mimeType,
}: {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  mimeType?: string;
}) {
  try {
    const [savedFile] = await db
      .insert(uploadedFile)
      .values({
        userId,
        fileName,
        fileType,
        fileSize,
        fileUrl,
        mimeType,
      })
      .returning();
    return savedFile;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save uploaded file',
    );
  }
}

export async function updateFileParsing({
  id,
  parsedContent,
  parsingStatus,
  parsingError,
}: {
  id: string;
  parsedContent?: string;
  parsingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  parsingError?: string;
}) {
  try {
    const [updatedFile] = await db
      .update(uploadedFile)
      .set({
        parsedContent,
        parsingStatus,
        parsingError,
        parsedAt: parsingStatus === 'completed' ? new Date() : undefined,
      })
      .where(eq(uploadedFile.id, id))
      .returning();
    return updatedFile;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update file parsing',
    );
  }
}

export async function getUploadedFileById({ id }: { id: string }) {
  try {
    const [file] = await db
      .select()
      .from(uploadedFile)
      .where(eq(uploadedFile.id, id));
    return file;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get uploaded file',
    );
  }
}

export async function getUploadedFilesByUserId({
  userId,
  limit = 50,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select()
      .from(uploadedFile)
      .where(eq(uploadedFile.userId, userId))
      .orderBy(desc(uploadedFile.uploadedAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get uploaded files',
    );
  }
}

export async function deleteUploadedFile({ id }: { id: string }) {
  try {
    const [deletedFile] = await db
      .delete(uploadedFile)
      .where(eq(uploadedFile.id, id))
      .returning();
    return deletedFile;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete uploaded file',
    );
  }
}

export async function getUploadedFilesByUrls({
  urls,
}: {
  urls: string[];
}) {
  try {
    return await db
      .select()
      .from(uploadedFile)
      .where(inArray(uploadedFile.fileUrl, urls));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get uploaded files by URLs',
    );
  }
}

// MCP Server Management Functions

export async function createMcpServer({
  userId,
  name,
  description,
  transportType,
  command,
  args,
  env,
  url,
  maxRetries = 3,
  retryDelay = 1000,
  timeout = 30000,
  isEnabled = true,
}: {
  userId: string;
  name: string;
  description?: string;
  transportType: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  isEnabled?: boolean;
}) {
  try {
    const [server] = await db
      .insert(mcpServer)
      .values({
        userId,
        name,
        description,
        transportType,
        command,
        args,
        env,
        url,
        maxRetries,
        retryDelay,
        timeout,
        isEnabled,
      })
      .returning();
    return server;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create MCP server',
    );
  }
}

export async function getMcpServersByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(mcpServer)
      .where(eq(mcpServer.userId, userId))
      .orderBy(desc(mcpServer.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get MCP servers',
    );
  }
}

export async function getMcpServerById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [server] = await db
      .select()
      .from(mcpServer)
      .where(and(eq(mcpServer.id, id), eq(mcpServer.userId, userId)));
    return server;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get MCP server',
    );
  }
}

export async function updateMcpServer({
  id,
  userId,
  name,
  description,
  transportType,
  command,
  args,
  env,
  url,
  maxRetries,
  retryDelay,
  timeout,
  isEnabled,
  connectionStatus,
  lastConnected,
  lastError,
  serverInfo,
}: {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  transportType?: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  isEnabled?: boolean;
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnected?: Date;
  lastError?: string;
  serverInfo?: { name?: string; version?: string; protocolVersion?: string };
}) {
  try {
    const [server] = await db
      .update(mcpServer)
      .set({
        name,
        description,
        transportType,
        command,
        args,
        env,
        url,
        maxRetries,
        retryDelay,
        timeout,
        isEnabled,
        connectionStatus,
        lastConnected,
        lastError,
        serverInfo,
        updatedAt: new Date(),
      })
      .where(and(eq(mcpServer.id, id), eq(mcpServer.userId, userId)))
      .returning();
    return server;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update MCP server',
    );
  }
}

export async function deleteMcpServer({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    const [server] = await db
      .delete(mcpServer)
      .where(and(eq(mcpServer.id, id), eq(mcpServer.userId, userId)))
      .returning();
    return server;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete MCP server',
    );
  }
}

export async function getEnabledMcpServersByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(mcpServer)
      .where(and(eq(mcpServer.userId, userId), eq(mcpServer.isEnabled, true)))
      .orderBy(desc(mcpServer.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get enabled MCP servers',
    );
  }
}

// MCP Tool Management Functions

export async function createMcpTool({
  serverId,
  name,
  description,
  inputSchema,
  outputSchema,
  isEnabled = true,
}: {
  serverId: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  isEnabled?: boolean;
}) {
  try {
    const [tool] = await db
      .insert(mcpTool)
      .values({
        serverId,
        name,
        description,
        inputSchema,
        outputSchema,
        isEnabled,
      })
      .returning();
    return tool;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create MCP tool',
    );
  }
}

export async function getMcpToolsByServerId({
  serverId,
}: {
  serverId: string;
}) {
  try {
    return await db
      .select()
      .from(mcpTool)
      .where(eq(mcpTool.serverId, serverId))
      .orderBy(asc(mcpTool.name));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get MCP tools',
    );
  }
}

export async function updateMcpTool({
  id,
  name,
  description,
  inputSchema,
  outputSchema,
  isEnabled,
  lastUsed,
  usageCount,
  averageExecutionTime,
}: {
  id: string;
  name?: string;
  description?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  isEnabled?: boolean;
  lastUsed?: Date;
  usageCount?: number;
  averageExecutionTime?: number;
}) {
  try {
    const [tool] = await db
      .update(mcpTool)
      .set({
        name,
        description,
        inputSchema,
        outputSchema,
        isEnabled,
        lastUsed,
        usageCount,
        averageExecutionTime,
        updatedAt: new Date(),
      })
      .where(eq(mcpTool.id, id))
      .returning();
    return tool;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update MCP tool',
    );
  }
}

export async function deleteMcpToolsByServerId({
  serverId,
}: {
  serverId: string;
}) {
  try {
    await db.delete(mcpTool).where(eq(mcpTool.serverId, serverId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete MCP tools',
    );
  }
}

export async function getEnabledMcpToolsByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select({
        tool: mcpTool,
        server: mcpServer,
      })
      .from(mcpTool)
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(
        and(
          eq(mcpServer.userId, userId),
          eq(mcpServer.isEnabled, true),
          eq(mcpTool.isEnabled, true),
        ),
      )
      .orderBy(asc(mcpTool.name));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get enabled MCP tools',
    );
  }
}

// MCP Tool Execution Management Functions

export async function createMcpToolExecution({
  toolId,
  chatId,
  messageId,
  input,
  output,
  executionTime,
  status = 'pending',
  error,
}: {
  toolId: string;
  chatId: string;
  messageId: string;
  input?: Record<string, any>;
  output?: any;
  executionTime?: number;
  status?: 'pending' | 'success' | 'error' | 'timeout';
  error?: string;
}) {
  try {
    const [execution] = await db
      .insert(mcpToolExecution)
      .values({
        toolId,
        chatId,
        messageId,
        input,
        output,
        executionTime,
        status,
        error,
      })
      .returning();
    return execution;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create MCP tool execution',
    );
  }
}

export async function updateMcpToolExecution({
  id,
  output,
  executionTime,
  status,
  error,
}: {
  id: string;
  output?: any;
  executionTime?: number;
  status: 'pending' | 'success' | 'error' | 'timeout';
  error?: string;
}) {
  try {
    const [execution] = await db
      .update(mcpToolExecution)
      .set({
        output,
        executionTime,
        status,
        error,
      })
      .where(eq(mcpToolExecution.id, id))
      .returning();
    return execution;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update MCP tool execution',
    );
  }
}

export async function getMcpToolExecutionsByUserId({
  userId,
  limit = 50,
}: {
  userId: string;
  limit?: number;
}) {
  try {
    return await db
      .select({
        execution: mcpToolExecution,
        tool: mcpTool,
        server: mcpServer,
      })
      .from(mcpToolExecution)
      .innerJoin(mcpTool, eq(mcpToolExecution.toolId, mcpTool.id))
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(eq(mcpServer.userId, userId))
      .orderBy(desc(mcpToolExecution.createdAt))
      .limit(limit);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get MCP tool executions',
    );
  }
}

export async function getMcpDashboardStats({
  userId,
}: {
  userId: string;
}) {
  try {
    const [serverStats] = await db
      .select({
        totalServers: count(mcpServer.id),
      })
      .from(mcpServer)
      .where(eq(mcpServer.userId, userId));

    const [connectedServerStats] = await db
      .select({
        connectedServers: count(mcpServer.id),
      })
      .from(mcpServer)
      .where(
        and(
          eq(mcpServer.userId, userId),
          eq(mcpServer.connectionStatus, 'connected'),
        ),
      );

    const [toolStats] = await db
      .select({
        totalTools: count(mcpTool.id),
      })
      .from(mcpTool)
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(eq(mcpServer.userId, userId));

    const [enabledToolStats] = await db
      .select({
        enabledTools: count(mcpTool.id),
      })
      .from(mcpTool)
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(
        and(
          eq(mcpServer.userId, userId),
          eq(mcpTool.isEnabled, true),
          eq(mcpServer.isEnabled, true),
        ),
      );

    const [executionStats] = await db
      .select({
        totalExecutions: count(mcpToolExecution.id),
      })
      .from(mcpToolExecution)
      .innerJoin(mcpTool, eq(mcpToolExecution.toolId, mcpTool.id))
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(eq(mcpServer.userId, userId));

    const [successfulExecutionStats] = await db
      .select({
        successfulExecutions: count(mcpToolExecution.id),
      })
      .from(mcpToolExecution)
      .innerJoin(mcpTool, eq(mcpToolExecution.toolId, mcpTool.id))
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(
        and(
          eq(mcpServer.userId, userId),
          eq(mcpToolExecution.status, 'success'),
        ),
      );

    return {
      totalServers: serverStats.totalServers || 0,
      connectedServers: connectedServerStats.connectedServers || 0,
      totalTools: toolStats.totalTools || 0,
      enabledTools: enabledToolStats.enabledTools || 0,
      totalExecutions: executionStats.totalExecutions || 0,
      successfulExecutions: successfulExecutionStats.successfulExecutions || 0,
      failedExecutions:
        (executionStats.totalExecutions || 0) -
        (successfulExecutionStats.successfulExecutions || 0),
      averageResponseTime: 0, // This would need a more complex query
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get MCP dashboard stats',
    );
  }
}

export async function getMcpToolsByUserId({
  userId,
}: {
  userId: string;
}) {
  try {
    return await db
      .select()
      .from(mcpTool)
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(eq(mcpServer.userId, userId))
      .orderBy(mcpServer.name, mcpTool.name);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get MCP tools by user ID',
    );
  }
}

export async function updateMcpToolEnabled({
  toolId,
  isEnabled,
  userId,
}: {
  toolId: string;
  isEnabled: boolean;
  userId: string;
}) {
  try {
    // Verify the tool belongs to the user before updating
    const [tool] = await db
      .select()
      .from(mcpTool)
      .innerJoin(mcpServer, eq(mcpTool.serverId, mcpServer.id))
      .where(
        and(
          eq(mcpTool.id, toolId),
          eq(mcpServer.userId, userId)
        )
      );

    if (!tool) {
      throw new ChatSDKError(
        'not_found',
        'Tool not found or access denied',
      );
    }

    await db
      .update(mcpTool)
      .set({ 
        isEnabled,
        updatedAt: new Date()
      })
      .where(eq(mcpTool.id, toolId));

  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update MCP tool enabled status',
    );
  }
}
