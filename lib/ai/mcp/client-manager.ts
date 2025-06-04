import { experimental_createMCPClient } from 'ai';
import type { Tool } from 'ai';
import { getUserMCPConfigs } from '@/lib/db/queries/mcp';
import { decryptCredentials } from './encryption';
import type {
  MCPTransportConfig,
  MCPCredentials,
  UserMCPConfiguration,
  MCPClientStatus,
} from './types';

interface MCPClientInfo {
  client: any; // MCPClient type from AI SDK
  config: UserMCPConfiguration;
  status: MCPClientStatus;
  lastConnected: Date;
}

export class MCPClientManager {
  private clients: Map<string, MCPClientInfo> = new Map();
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get or create an MCP client for a specific user and server
   */
  async getOrCreateClient(
    userId: string,
    mcpServerId: string,
  ): Promise<MCPClientInfo | null> {
    const clientKey = `${userId}:${mcpServerId}`;

    // Return existing client if available and connected
    const existing = this.clients.get(clientKey);
    if (existing?.status.connected) {
      return existing;
    }

    // Get user's MCP configuration
    const configs = await getUserMCPConfigs(userId);
    const config = configs.find(
      (c) => c.mcpServerId === mcpServerId && c.enabled,
    );

    if (!config) {
      return null;
    }

    try {
      const client = await this.createMCPClient(config, userId);
      const clientInfo: MCPClientInfo = {
        client,
        config,
        status: {
          connected: true,
          toolCount: 0,
        },
        lastConnected: new Date(),
      };

      // Get tool count
      try {
        const tools = await client.tools();
        clientInfo.status.toolCount = Object.keys(tools).length;
      } catch (error) {
        console.warn(`Failed to get tools for MCP ${mcpServerId}:`, error);
      }

      this.clients.set(clientKey, clientInfo);

      // Set up auto-cleanup after 30 minutes of inactivity
      this.scheduleCleanup(clientKey);

      return clientInfo;
    } catch (error) {
      console.error(`Failed to create MCP client for ${mcpServerId}:`, error);

      // Store failed connection info
      const failedInfo: MCPClientInfo = {
        client: null,
        config,
        status: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          toolCount: 0,
        },
        lastConnected: new Date(),
      };

      this.clients.set(clientKey, failedInfo);
      return failedInfo;
    }
  }

  /**
   * Get all MCP tools for a user
   */
  async getUserMCPTools(userId: string): Promise<Tool[]> {
    const configs = await getUserMCPConfigs(userId);
    const enabledConfigs = configs.filter((c) => c.enabled);

    const allTools: Tool[] = [];

    for (const config of enabledConfigs) {
      try {
        const clientInfo = await this.getOrCreateClient(
          userId,
          config.mcpServerId,
        );

        if (!clientInfo || !clientInfo.client || !clientInfo.status.connected) {
          continue;
        }

        const tools = await clientInfo.client.tools();

        // Filter tools based on user's tool configuration
        const enabledToolNames = config.toolConfigs
          .filter((tc) => tc.enabled)
          .map((tc) => tc.toolName);

        // If no specific tool configs, enable all tools
        const toolsToInclude =
          enabledToolNames.length > 0
            ? Object.entries(tools).filter(([name]) =>
                enabledToolNames.includes(name),
              )
            : Object.entries(tools);

        for (const [name, tool] of toolsToInclude) {
          allTools.push(tool as Tool);
        }
      } catch (error) {
        console.error(
          `Failed to get tools for MCP ${config.server.name}:`,
          error,
        );
      }
    }

    return allTools;
  }

  /**
   * Get status of all MCP clients for a user
   */
  async getUserMCPStatus(
    userId: string,
  ): Promise<Record<string, MCPClientStatus>> {
    const configs = await getUserMCPConfigs(userId);
    const status: Record<string, MCPClientStatus> = {};

    for (const config of configs) {
      const clientKey = `${userId}:${config.mcpServerId}`;
      const clientInfo = this.clients.get(clientKey);

      if (clientInfo) {
        status[config.mcpServerId] = clientInfo.status;
      } else if (config.enabled) {
        // Try to connect if enabled but not connected
        const clientInfo = await this.getOrCreateClient(
          userId,
          config.mcpServerId,
        );
        status[config.mcpServerId] = clientInfo?.status || {
          connected: false,
          error: 'Failed to connect',
          toolCount: 0,
        };
      } else {
        status[config.mcpServerId] = {
          connected: false,
          toolCount: 0,
        };
      }
    }

    return status;
  }

  /**
   * Close a specific MCP client
   */
  async closeClient(userId: string, mcpServerId: string): Promise<void> {
    const clientKey = `${userId}:${mcpServerId}`;
    const clientInfo = this.clients.get(clientKey);

    if (clientInfo?.client) {
      try {
        await clientInfo.client.close();
      } catch (error) {
        console.error(`Error closing MCP client ${clientKey}:`, error);
      }
    }

    this.clients.delete(clientKey);

    const timeout = this.connectionTimeouts.get(clientKey);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(clientKey);
    }
  }

  /**
   * Close all MCP clients for a user
   */
  async closeUserClients(userId: string): Promise<void> {
    const clientKeys = Array.from(this.clients.keys()).filter((key) =>
      key.startsWith(`${userId}:`),
    );

    for (const clientKey of clientKeys) {
      const [, mcpServerId] = clientKey.split(':');
      await this.closeClient(userId, mcpServerId);
    }
  }

  /**
   * Test connection to an MCP server
   */
  async testConnection(
    config: UserMCPConfiguration,
    userId: string,
  ): Promise<{ success: boolean; error?: string; toolCount?: number }> {
    try {
      const client = await this.createMCPClient(config, userId);

      // Test by getting tools
      const tools = await client.tools();
      const toolCount = Object.keys(tools).length;

      // Close the test client
      await client.close();

      return { success: true, toolCount };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create an MCP client based on configuration
   */
  private async createMCPClient(
    config: UserMCPConfiguration,
    userId: string,
  ): Promise<any> {
    const { server } = config;
    const transportConfig = server.transportConfig;

    // Decrypt credentials if available
    let credentials: MCPCredentials = {};
    if (config.credentials) {
      try {
        credentials = await decryptCredentials(
          JSON.stringify(config.credentials),
          userId,
        );
      } catch (error) {
        console.error('Failed to decrypt MCP credentials:', error);
      }
    }

    // Build transport configuration
    let mcpTransport: any;

    if (transportConfig.type === 'sse') {
      mcpTransport = {
        type: 'sse',
        url: transportConfig.url,
        headers: {
          ...transportConfig.headers,
          ...this.buildAuthHeaders(credentials),
        },
      };
    } else if (transportConfig.type === 'stdio_proxy') {
      // Build environment variables for stdio transport
      const env = { ...process.env };

      // For Notion MCP server, build the special OPENAPI_MCP_HEADERS
      if (transportConfig.envHeaders && credentials.apiKey) {
        const headers = {
          Authorization: `Bearer ${credentials.apiKey}`,
          'Notion-Version': '2022-06-28',
        };
        env.OPENAPI_MCP_HEADERS = JSON.stringify(headers);
      }

      mcpTransport = {
        type: 'stdio',
        command: transportConfig.command,
        args: transportConfig.args,
        env,
      };
    } else {
      throw new Error(`Unsupported transport type: ${transportConfig.type}`);
    }

    return await experimental_createMCPClient({
      transport: mcpTransport,
    });
  }

  /**
   * Build authentication headers from credentials
   */
  private buildAuthHeaders(
    credentials: MCPCredentials,
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    // Common authentication patterns
    if (credentials.apiKey) {
      headers.Authorization = `Bearer ${credentials.apiKey}`;
    }

    if (credentials.token) {
      headers.Authorization = `Bearer ${credentials.token}`;
    }

    if (credentials.authorization) {
      headers.Authorization = credentials.authorization;
    }

    // Add any custom headers
    Object.entries(credentials).forEach(([key, value]) => {
      if (key.startsWith('header_')) {
        const headerName = key.replace('header_', '');
        headers[headerName] = value;
      }
    });

    return headers;
  }

  /**
   * Schedule cleanup of inactive client
   */
  private scheduleCleanup(clientKey: string): void {
    // Clear existing timeout
    const existingTimeout = this.connectionTimeouts.get(clientKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for 30 minutes
    const timeout = setTimeout(
      () => {
        const [userId, mcpServerId] = clientKey.split(':');
        this.closeClient(userId, mcpServerId);
      },
      30 * 60 * 1000,
    ); // 30 minutes

    this.connectionTimeouts.set(clientKey, timeout);
  }
}

// Global instance
export const mcpClientManager = new MCPClientManager();
