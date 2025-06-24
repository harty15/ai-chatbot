import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  memoryCollectionEnabled: boolean('memoryCollectionEnabled')
    .notNull()
    .default(true),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

export const memory = pgTable('Memory', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  tags: json('tags').$type<string[]>().notNull().default([]),
  originalMessage: text('originalMessage'),
  originalMessageId: uuid('originalMessageId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Memory = InferSelectModel<typeof memory>;

export const uploadedFile = pgTable('UploadedFile', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  fileName: text('fileName').notNull(),
  fileType: varchar('fileType', { length: 50 }).notNull(),
  fileSize: integer('fileSize').notNull(),
  fileUrl: text('fileUrl').notNull(),
  mimeType: varchar('mimeType', { length: 100 }),
  parsedContent: text('parsedContent'),
  parsingStatus: varchar('parsingStatus', {
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  parsingError: text('parsingError'),
  uploadedAt: timestamp('uploadedAt').notNull().defaultNow(),
  parsedAt: timestamp('parsedAt'),
});

export type UploadedFile = InferSelectModel<typeof uploadedFile>;

export const mcpServer = pgTable('McpServer', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  transportType: varchar('transportType', { enum: ['stdio', 'sse'] })
    .notNull()
    .default('stdio'),
  // For stdio transport
  command: text('command'),
  args: json('args').$type<string[]>(),
  env: json('env').$type<Record<string, string>>(),
  // For SSE transport
  url: text('url'),
  // Server configuration
  maxRetries: integer('maxRetries').notNull().default(3),
  retryDelay: integer('retryDelay').notNull().default(1000), // milliseconds
  timeout: integer('timeout').notNull().default(30000), // milliseconds
  // Status and metadata
  isEnabled: boolean('isEnabled').notNull().default(true),
  connectionStatus: varchar('connectionStatus', {
    enum: ['disconnected', 'connecting', 'connected', 'error'],
  })
    .notNull()
    .default('disconnected'),
  lastConnected: timestamp('lastConnected'),
  lastError: text('lastError'),
  serverInfo: json('serverInfo').$type<{
    name?: string;
    version?: string;
    protocolVersion?: string;
  }>(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type McpServer = InferSelectModel<typeof mcpServer>;

export const mcpTool = pgTable('McpTool', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  serverId: uuid('serverId')
    .notNull()
    .references(() => mcpServer.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  inputSchema: json('inputSchema').$type<Record<string, any>>(),
  outputSchema: json('outputSchema').$type<Record<string, any>>(),
  // Tool metadata
  isEnabled: boolean('isEnabled').notNull().default(true),
  lastUsed: timestamp('lastUsed'),
  usageCount: integer('usageCount').notNull().default(0),
  averageExecutionTime: integer('averageExecutionTime'), // milliseconds
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type McpTool = InferSelectModel<typeof mcpTool>;

export const mcpToolExecution = pgTable('McpToolExecution', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  toolId: uuid('toolId')
    .notNull()
    .references(() => mcpTool.id, { onDelete: 'cascade' }),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  messageId: uuid('messageId')
    .notNull()
    .references(() => message.id),
  // Execution details
  input: json('input').$type<Record<string, any>>(),
  output: json('output').$type<any>(),
  executionTime: integer('executionTime'), // milliseconds
  status: varchar('status', {
    enum: ['pending', 'success', 'error', 'timeout'],
  })
    .notNull()
    .default('pending'),
  error: text('error'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type McpToolExecution = InferSelectModel<typeof mcpToolExecution>;
