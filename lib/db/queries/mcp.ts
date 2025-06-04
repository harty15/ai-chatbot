import { and, eq, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);
import {
  mcpServer,
  userMCPConfig,
  userMCPToolConfig,
  type MCPServer,
  type UserMCPConfig,
  type UserMCPToolConfig,
} from '../schema';
import type { MCPServerInfo, UserMCPConfiguration } from '@/lib/ai/mcp/types';

// MCP Server queries
export async function getMCPServerById(id: string): Promise<MCPServer | null> {
  const [server] = await db
    .select()
    .from(mcpServer)
    .where(eq(mcpServer.id, id))
    .limit(1);

  return server || null;
}

export async function getPublicMCPServers(): Promise<MCPServer[]> {
  return await db
    .select()
    .from(mcpServer)
    .where(eq(mcpServer.isPublic, true))
    .orderBy(desc(mcpServer.createdAt));
}

export async function getCuratedMCPServers(): Promise<MCPServer[]> {
  return await db
    .select()
    .from(mcpServer)
    .where(eq(mcpServer.isCurated, true))
    .orderBy(desc(mcpServer.createdAt));
}

export async function createMCPServer(data: {
  name: string;
  description?: string;
  iconUrl?: string;
  transportType: 'sse' | 'stdio_proxy';
  transportConfig: any;
  schemaConfig?: any;
  createdByUserId?: string;
  isPublic?: boolean;
  isCurated?: boolean;
}): Promise<MCPServer> {
  const [server] = await db
    .insert(mcpServer)
    .values({
      ...data,
      isPublic: data.isPublic ?? false,
      isCurated: data.isCurated ?? false,
    })
    .returning();

  return server;
}

// User MCP Configuration queries
export async function getUserMCPConfigs(
  userId: string,
): Promise<UserMCPConfiguration[]> {
  const configs = await db
    .select({
      config: userMCPConfig,
      server: mcpServer,
    })
    .from(userMCPConfig)
    .innerJoin(mcpServer, eq(userMCPConfig.mcpServerId, mcpServer.id))
    .where(eq(userMCPConfig.userId, userId))
    .orderBy(desc(userMCPConfig.createdAt));

  const result: UserMCPConfiguration[] = [];

  for (const { config, server } of configs) {
    const toolConfigs = await getUserMCPToolConfigs(userId, server.id);

    result.push({
      id: config.id,
      userId: config.userId,
      mcpServerId: config.mcpServerId,
      enabled: config.enabled,
      server: {
        id: server.id,
        name: server.name,
        description: server.description || undefined,
        iconUrl: server.iconUrl || undefined,
        transportType: server.transportType as 'sse' | 'stdio_proxy',
        transportConfig: server.transportConfig as any,
        schemaConfig: server.schemaConfig,
        isPublic: server.isPublic,
        isCurated: server.isCurated,
        createdByUserId: server.createdByUserId || undefined,
      },
      toolConfigs: toolConfigs.map((tc) => ({
        toolName: tc.toolName,
        enabled: tc.enabled,
      })),
    });
  }

  return result;
}

export async function getUserMCPConfig(
  userId: string,
  mcpServerId: string,
): Promise<UserMCPConfig | null> {
  const [config] = await db
    .select()
    .from(userMCPConfig)
    .where(
      and(
        eq(userMCPConfig.userId, userId),
        eq(userMCPConfig.mcpServerId, mcpServerId),
      ),
    )
    .limit(1);

  return config || null;
}

export async function createUserMCPConfig(data: {
  userId: string;
  mcpServerId: string;
  enabled?: boolean;
  encryptedCredentials?: string;
}): Promise<UserMCPConfig> {
  const [config] = await db
    .insert(userMCPConfig)
    .values({
      ...data,
      enabled: data.enabled ?? false,
    })
    .returning();

  return config;
}

export async function updateUserMCPConfig(
  userId: string,
  mcpServerId: string,
  updates: {
    enabled?: boolean;
    encryptedCredentials?: string;
  },
): Promise<UserMCPConfig | null> {
  const [config] = await db
    .update(userMCPConfig)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userMCPConfig.userId, userId),
        eq(userMCPConfig.mcpServerId, mcpServerId),
      ),
    )
    .returning();

  return config || null;
}

export async function deleteUserMCPConfig(
  userId: string,
  mcpServerId: string,
): Promise<boolean> {
  // First delete tool configs
  await db
    .delete(userMCPToolConfig)
    .where(
      and(
        eq(userMCPToolConfig.userId, userId),
        eq(userMCPToolConfig.mcpServerId, mcpServerId),
      ),
    );

  // Then delete the main config
  const result = await db
    .delete(userMCPConfig)
    .where(
      and(
        eq(userMCPConfig.userId, userId),
        eq(userMCPConfig.mcpServerId, mcpServerId),
      ),
    );

  return result.length > 0;
}

// User MCP Tool Configuration queries
export async function getUserMCPToolConfigs(
  userId: string,
  mcpServerId: string,
): Promise<UserMCPToolConfig[]> {
  return await db
    .select()
    .from(userMCPToolConfig)
    .where(
      and(
        eq(userMCPToolConfig.userId, userId),
        eq(userMCPToolConfig.mcpServerId, mcpServerId),
      ),
    );
}

export async function updateUserMCPToolConfig(
  userId: string,
  mcpServerId: string,
  toolName: string,
  enabled: boolean,
): Promise<UserMCPToolConfig> {
  // Try to update existing config
  const [existing] = await db
    .update(userMCPToolConfig)
    .set({ enabled })
    .where(
      and(
        eq(userMCPToolConfig.userId, userId),
        eq(userMCPToolConfig.mcpServerId, mcpServerId),
        eq(userMCPToolConfig.toolName, toolName),
      ),
    )
    .returning();

  if (existing) {
    return existing;
  }

  // Create new config if it doesn't exist
  const [newConfig] = await db
    .insert(userMCPToolConfig)
    .values({
      userId,
      mcpServerId,
      toolName,
      enabled,
    })
    .returning();

  return newConfig;
}

export async function updateUserMCPCredentials(
  userId: string,
  mcpServerId: string,
  encryptedCredentials: string,
): Promise<UserMCPConfig | null> {
  return await updateUserMCPConfig(userId, mcpServerId, {
    encryptedCredentials,
  });
}
