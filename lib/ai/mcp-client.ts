import { experimental_createMCPClient as createMCPClient } from 'ai';
import type {
  MCPClientConfig,
  MCPTransportConfig,
  MCPConnectionState,
  MCPConnectionStatus,
  MCPServerInfo,
  MCPToolDefinition,
  MCPToolCall,
  MCPToolResult,
  MCPEvent,
} from './mcp-types';
import {
  MCPError,
  MCPConnectionError,
  MCPToolExecutionError,
  MCPTimeoutError,
} from './mcp-types';
import { MCPErrorHandler } from './mcp-error-handler';

/**
 * Core MCP Client class for managing connections to MCP servers
 */
export class MCPClient {
  private client: any = null;
  private connectionState: MCPConnectionState;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<(event: MCPEvent) => void>> =
    new Map();

  constructor(
    public readonly serverId: string,
    public readonly config: MCPClientConfig,
  ) {
    this.connectionState = {
      status: 'disconnected',
      availableTools: [],
      retryCount: 0,
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (
      this.connectionState.status === 'connecting' &&
      this.connectionPromise
    ) {
      return this.connectionPromise;
    }

    console.log(`🔌 Attempting to connect to MCP server: ${this.serverId}`);
    this.connectionState.status = 'connecting';
    this.emitEvent({ type: 'connection_status_changed', status: 'connecting' });

    this.connectionPromise = this._performConnection().catch((error) => {
      // Always handle connection errors to prevent unhandled rejections
      console.warn(
        `❌ MCP connection failed for server ${this.serverId}:`,
        error,
      );
      this.connectionState.status = 'error';
      this.connectionState.lastError = error.message || 'Connection failed';
      this.emitEvent({
        type: 'connection_status_changed',
        status: 'error',
        error: error.message,
      });
      throw error;
    });

    try {
      await this.connectionPromise;
      console.log(`✅ Successfully connected to MCP server: ${this.serverId}`);
    } catch (error) {
      console.error(
        `❌ Final connection failure for server ${this.serverId}:`,
        error,
      );
      // Re-throw but ensure it's handled
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.client) {
      try {
        // Close the client connection if it has a close method
        if (typeof this.client.close === 'function') {
          await this.client.close();
        }
      } catch (error) {
        console.warn(
          `Error closing MCP client for server ${this.serverId}:`,
          error,
        );
      }
      this.client = null;
    }

    this.connectionState.status = 'disconnected';
    this.connectionState.serverInfo = undefined;
    this.connectionState.availableTools = [];
    this.connectionState.retryCount = 0;

    this.emitEvent({
      type: 'connection_status_changed',
      status: 'disconnected',
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): MCPConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get available tools from the connected server
   */
  getAvailableTools(): MCPToolDefinition[] {
    return [...this.connectionState.availableTools];
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.connectionState.status === 'connected' && this.client !== null;
  }

  /**
   * Execute a tool on the connected MCP server
   */
  async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    if (!this.isConnected()) {
      throw new MCPConnectionError(
        `Cannot execute tool: not connected to server ${this.serverId}`,
        this.serverId,
      );
    }

    const startTime = Date.now();

    try {
      this.emitEvent({
        type: 'tool_execution',
        toolName: toolCall.name,
        executionId: `${this.serverId}-${toolCall.name}-${Date.now()}`,
        status: 'started',
      });

      // Use AI SDK's MCP client to call the tool
      const result = await this.client.callTool(
        toolCall.name,
        toolCall.arguments,
      );

      const executionTime = Date.now() - startTime;

      this.emitEvent({
        type: 'tool_execution',
        toolName: toolCall.name,
        executionId: `${this.serverId}-${toolCall.name}-${startTime}`,
        status: 'completed',
        result,
        executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.emitEvent({
        type: 'tool_execution',
        toolName: toolCall.name,
        executionId: `${this.serverId}-${toolCall.name}-${startTime}`,
        status: 'failed',
        error: errorMessage,
        executionTime,
      });

      // Handle timeout errors
      if (error instanceof Error && error.name === 'TimeoutError') {
        const timeoutError = new MCPTimeoutError(
          `Tool execution timed out: ${toolCall.name}`,
          this.serverId,
          toolCall.name,
        );

        MCPErrorHandler.handleTimeoutError(
          timeoutError,
          `tool execution for ${toolCall.name}`,
        );

        throw timeoutError;
      }

      // Handle general tool execution errors
      const toolError = new MCPToolExecutionError(
        `Failed to execute tool ${toolCall.name}: ${errorMessage}`,
        this.serverId,
        toolCall.name,
      );

      MCPErrorHandler.handleToolExecutionError(
        toolError,
        toolCall.name,
        this.config.name || `Server ${this.serverId}`,
      );

      throw toolError;
    }
  }

  /**
   * Get tools formatted for AI SDK integration
   */
  async getAISDKTools(): Promise<Record<string, any>> {
    if (!this.isConnected()) {
      return {};
    }

    try {
      return await this.client.tools();
    } catch (error) {
      MCPErrorHandler.handleGeneralError(
        error instanceof Error ? error : new Error(String(error)),
        `getting tools from server ${this.serverId}`,
      );
      return {};
    }
  }

  /**
   * Add event listener
   */
  addEventListener(
    eventType: string,
    listener: (event: MCPEvent) => void,
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: string,
    listener: (event: MCPEvent) => void,
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Perform the actual connection to the MCP server
   */
  private async _performConnection(): Promise<void> {
    const maxRetries = this.config.maxRetries ?? 3;
    const retryDelay = this.config.retryDelay ?? 1000;
    const timeout = this.config.timeout ?? 10000; // Reduced default timeout

    console.log(`🔗 MCP Connection config for ${this.serverId}:`, {
      transport: this.config.transport.type,
      timeout,
      maxRetries,
      url:
        this.config.transport.type === 'sse'
          ? this.config.transport.url
          : 'N/A',
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Connection attempt ${attempt + 1}/${maxRetries + 1} for server ${this.serverId}`,
        );

        // Validate transport configuration before attempting connection
        this._validateTransportConfig();

        // Create MCP client using AI SDK with timeout
        const connectionPromise = createMCPClient({
          transport: this.config.transport,
        });

        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error(`Connection timeout after ${timeout}ms`)),
            timeout,
          );
        });

        this.client = await Promise.race([connectionPromise, timeoutPromise]);

        // Test the connection by getting server info
        const serverInfo = await this._getServerInfo();

        // Get available tools
        const tools = await this._getTools();

        this.connectionState = {
          status: 'connected',
          serverInfo,
          availableTools: tools,
          lastConnected: new Date(),
          retryCount: 0,
        };

        this.emitEvent({
          type: 'connection_status_changed',
          status: 'connected',
          serverInfo,
        });

        this.emitEvent({
          type: 'tools_updated',
          tools,
        });

        console.log(
          `✅ MCP server ${this.serverId} connected successfully with ${tools.length} tools`,
        );
        return;
      } catch (error) {
        const mcpError =
          error instanceof MCPConnectionError
            ? error
            : new MCPConnectionError(
                error instanceof Error ? error.message : 'Unknown error',
                this.serverId,
              );

        console.warn(
          `⚠️ Connection attempt ${attempt + 1} failed for server ${this.serverId}:`,
          mcpError.message,
        );

        if (attempt === maxRetries) {
          this.connectionState.status = 'error';
          this.connectionState.lastError = mcpError.message;
          this.connectionState.retryCount = attempt + 1;

          this.emitEvent({
            type: 'connection_status_changed',
            status: 'error',
            error: mcpError.message,
          });

          // Use enhanced error handling
          await MCPErrorHandler.handleConnectionError(
            mcpError,
            this.serverId,
            this.config.name || `Server ${this.serverId}`,
            async () => {
              // Retry callback - attempt to reconnect
              setTimeout(() => this.connect(), 5000); // Retry after 5 seconds
            },
          );

          throw mcpError;
        }

        // Wait before retrying with exponential backoff
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        console.log(
          `⏳ Waiting ${backoffDelay}ms before retry for server ${this.serverId}`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  /**
   * Validate transport configuration
   */
  private _validateTransportConfig(): void {
    const transport = this.config.transport;

    if (transport.type === 'sse') {
      if (!transport.url) {
        throw new MCPConnectionError(
          'SSE transport requires a URL',
          this.serverId,
        );
      }

      try {
        new URL(transport.url);
      } catch {
        throw new MCPConnectionError(
          `Invalid SSE URL: ${transport.url}`,
          this.serverId,
        );
      }
    } else if (transport.type === 'stdio') {
      if (!transport.command) {
        throw new MCPConnectionError(
          'stdio transport requires a command',
          this.serverId,
        );
      }
    }
  }

  /**
   * Get server information
   */
  private async _getServerInfo(): Promise<MCPServerInfo> {
    try {
      // This would depend on the actual AI SDK MCP client API
      // For now, return basic info
      return {
        name: `MCP Server ${this.serverId}`,
        version: '1.0.0',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: true,
          resources: false,
          prompts: false,
          logging: false,
        },
      };
    } catch (error) {
      throw new MCPConnectionError(
        `Failed to get server info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.serverId,
      );
    }
  }

  /**
   * Get available tools from the server
   */
  private async _getTools(): Promise<MCPToolDefinition[]> {
    try {
      // Get tools using AI SDK client
      const toolsObject = await this.client.tools();

      // Convert to our tool definition format
      return Object.entries(toolsObject).map(([name, tool]: [string, any]) => ({
        name,
        description: tool.description || `Tool: ${name}`,
        inputSchema: tool.parameters || {
          type: 'object',
          properties: {},
          required: [],
        },
      }));
    } catch (error) {
      console.warn(`Failed to get tools from server ${this.serverId}:`, error);
      return [];
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: Omit<MCPEvent, 'serverId' | 'timestamp'>): void {
    const fullEvent: MCPEvent = {
      ...event,
      serverId: this.serverId,
      timestamp: new Date(),
    };

    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(fullEvent);
        } catch (error) {
          console.error('Error in MCP event listener:', error);
        }
      });
    }
  }

  /**
   * Check if this client should be connected (graceful state check)
   */
  shouldBeConnected(): boolean {
    return (
      this.connectionState.status === 'connected' ||
      this.connectionState.status === 'connecting'
    );
  }

  /**
   * Gracefully reconnect if the connection was lost
   */
  async gracefulReconnect(): Promise<void> {
    if (this.connectionState.status === 'connected' && !this.isConnected()) {
      console.log(`🔄 Graceful reconnect for MCP server: ${this.serverId}`);

      try {
        // Reset state and reconnect
        this.connectionState.status = 'disconnected';
        await this.connect();
      } catch (error) {
        console.warn(
          `❌ Graceful reconnect failed for server ${this.serverId}:`,
          error,
        );
        throw error;
      }
    }
  }
}

/**
 * MCP Client Manager for handling multiple server connections
 */
export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  private globalEventListeners: Map<string, Set<(event: MCPEvent) => void>> =
    new Map();

  /**
   * Add a new MCP server
   */
  async addServer(
    serverId: string,
    config: MCPClientConfig,
  ): Promise<MCPClient> {
    if (this.clients.has(serverId)) {
      throw new MCPError(
        `Server ${serverId} already exists`,
        'DUPLICATE_SERVER',
      );
    }

    const client = new MCPClient(serverId, config);

    // Forward all events to global listeners
    client.addEventListener('connection_status_changed', (event) =>
      this.emitGlobalEvent(event),
    );
    client.addEventListener('tools_updated', (event) =>
      this.emitGlobalEvent(event),
    );
    client.addEventListener('tool_execution', (event) =>
      this.emitGlobalEvent(event),
    );

    this.clients.set(serverId, client);
    return client;
  }

  /**
   * Remove an MCP server
   */
  async removeServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new MCPError(`Server ${serverId} not found`, 'SERVER_NOT_FOUND');
    }

    await client.disconnect();
    this.clients.delete(serverId);
  }

  /**
   * Get a specific MCP client
   */
  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
  }

  /**
   * Get all MCP clients
   */
  getAllClients(): Map<string, MCPClient> {
    return new Map(this.clients);
  }

  /**
   * Connect all servers
   */
  async connectAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.clients.values()).map((client) => client.connect()),
    );
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    await Promise.allSettled(
      Array.from(this.clients.values()).map((client) => client.disconnect()),
    );
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<Record<string, any>> {
    const allTools: Record<string, any> = {};

    for (const [serverId, client] of this.clients) {
      if (client.isConnected()) {
        try {
          const serverTools = await client.getAISDKTools();
          Object.assign(allTools, serverTools);
        } catch (error) {
          MCPErrorHandler.handleGeneralError(
            error instanceof Error ? error : new Error(String(error)),
            `getting tools from server ${serverId}`,
          );
        }
      }
    }

    return allTools;
  }

  /**
   * Get connection states for all servers
   */
  getAllConnectionStates(): Record<string, MCPConnectionState> {
    const states: Record<string, MCPConnectionState> = {};

    for (const [serverId, client] of this.clients) {
      states[serverId] = client.getConnectionState();
    }

    return states;
  }

  /**
   * Add global event listener
   */
  addEventListener(
    eventType: string,
    listener: (event: MCPEvent) => void,
  ): void {
    if (!this.globalEventListeners.has(eventType)) {
      this.globalEventListeners.set(eventType, new Set());
    }
    this.globalEventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove global event listener
   */
  removeEventListener(
    eventType: string,
    listener: (event: MCPEvent) => void,
  ): void {
    const listeners = this.globalEventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Safely disconnect a server (used for toggle operations)
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client && client.isConnected()) {
      try {
        await client.disconnect();
        console.log(`🔌 Disconnected MCP server: ${serverId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to disconnect MCP server ${serverId}:`, error);
      }
    }
  }

  /**
   * Reconnect a server (used for toggle operations)
   */
  async reconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      try {
        if (client.isConnected()) {
          await client.disconnect();
        }
        await client.connect();
        console.log(`🔌 Reconnected MCP server: ${serverId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to reconnect MCP server ${serverId}:`, error);
        throw error;
      }
    } else {
      throw new MCPError(`Server ${serverId} not found`, 'SERVER_NOT_FOUND');
    }
  }

  /**
   * Check if a server exists in the manager
   */
  hasServer(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Get connected server count
   */
  getConnectedCount(): number {
    return Array.from(this.clients.values()).filter((client) =>
      client.isConnected(),
    ).length;
  }

  /**
   * Get total server count
   */
  getTotalCount(): number {
    return this.clients.size;
  }

  /**
   * Emit global event
   */
  private emitGlobalEvent(event: MCPEvent): void {
    const listeners = this.globalEventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in global MCP event listener:', error);
        }
      });
    }
  }
}

// Global MCP client manager instance
export const mcpClientManager = new MCPClientManager();

// Add global error handlers for MCP-related unhandled rejections
if (typeof process !== 'undefined') {
  const originalUnhandledRejection = process.listeners('unhandledRejection');

  process.on('unhandledRejection', (reason: any, promise) => {
    // Check if this is an MCP-related error
    if (
      reason &&
      (reason.message?.includes('terminated') ||
        reason.message?.includes('SocketError') ||
        reason.message?.includes('other side closed') ||
        reason.code === 'UND_ERR_SOCKET')
    ) {
      // Log it but don't crash the process
      console.warn(
        'MCP socket connection closed unexpectedly:',
        reason.message || reason,
      );
      return;
    }

    // Re-emit for other types of unhandled rejections
    if (originalUnhandledRejection.length === 0) {
      console.error('Unhandled Rejection:', reason);
    }
  });
}
