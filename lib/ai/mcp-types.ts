import type { McpServer, McpTool, McpToolExecution } from '@/lib/db/schema';

// Core MCP Protocol Types
export interface MCPTransport {
  type: 'stdio' | 'sse';
}

export interface StdioTransport extends MCPTransport {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SSETransport extends MCPTransport {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export type MCPTransportConfig = StdioTransport | SSETransport;

// MCP Client Types
export interface MCPClientConfig {
  transport: MCPTransportConfig;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
}

export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Client Connection States
export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MCPConnectionState {
  status: MCPConnectionStatus;
  serverInfo?: MCPServerInfo;
  availableTools: MCPToolDefinition[];
  lastConnected?: Date;
  lastError?: string;
  retryCount: number;
}

// UI Types for MCP Management
export interface MCPServerFormData {
  name: string;
  description?: string;
  transportType: 'stdio' | 'sse';
  // stdio fields
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // sse fields
  url?: string;
  // configuration
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  isEnabled?: boolean;
}

export interface MCPServerWithTools extends McpServer {
  tools: McpTool[];
  toolCount: number;
  connectionState: MCPConnectionState;
}

export interface MCPToolWithStats extends McpTool {
  recentExecutions: McpToolExecution[];
  successRate: number;
  averageResponseTime: number;
}

// MCP Dashboard Types
export interface MCPDashboardStats {
  totalServers: number;
  connectedServers: number;
  totalTools: number;
  enabledTools: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTime: number;
}

export interface MCPRecentActivity {
  id: string;
  type: 'connection' | 'tool_execution' | 'server_added' | 'server_removed';
  serverName: string;
  toolName?: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  timestamp: Date;
}

// Error Types
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public serverId?: string,
    public toolName?: string,
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message: string, serverId?: string) {
    super(message, 'CONNECTION_ERROR', serverId);
    this.name = 'MCPConnectionError';
  }
}

export class MCPToolExecutionError extends MCPError {
  constructor(message: string, serverId?: string, toolName?: string) {
    super(message, 'TOOL_EXECUTION_ERROR', serverId, toolName);
    this.name = 'MCPToolExecutionError';
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(message: string, serverId?: string, toolName?: string) {
    super(message, 'TIMEOUT_ERROR', serverId, toolName);
    this.name = 'MCPTimeoutError';
  }
}

// Event Types for Real-time Updates
export interface MCPEvent {
  type: string;
  serverId: string;
  timestamp: Date;
}

export interface MCPConnectionEvent extends MCPEvent {
  type: 'connection_status_changed';
  status: MCPConnectionStatus;
  serverInfo?: MCPServerInfo;
  error?: string;
}

export interface MCPToolsUpdatedEvent extends MCPEvent {
  type: 'tools_updated';
  tools: MCPToolDefinition[];
}

export interface MCPToolExecutionEvent extends MCPEvent {
  type: 'tool_execution';
  toolName: string;
  executionId: string;
  status: 'started' | 'completed' | 'failed';
  result?: MCPToolResult;
  error?: string;
  executionTime?: number;
}

// Pre-configured Server Templates
export interface MCPServerTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'development' | 'productivity' | 'integration' | 'utility';
  transport: MCPTransportConfig;
  setupInstructions?: string;
  requiresAuth?: boolean;
  authFields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'url';
    required: boolean;
    placeholder?: string;
  }>;
}

// Popular MCP Server Templates
export const MCP_SERVER_TEMPLATES: MCPServerTemplate[] = [
  // Cloud-Compatible Templates
  {
    id: 'dealcloud-remote',
    name: 'Deal Cloud',
    description: 'Deal Cloud integration via remote MCP',
    icon: '💼',
    category: 'integration',
    transport: {
      type: 'sse',
      url: 'https://deal-cloud.sante-automation.com/mcp',
    },
  },
  {
    id: 'sante-utils-local',
    name: 'Sante Utils (Local)',
    description: 'Custom utility tools via local MCP server',
    icon: '🛠️',
    category: 'utility',
    transport: {
      type: 'sse',
      url: 'http://localhost:8000/mcp',
    },
    requiresAuth: true,
    authFields: [
      {
        name: 'ANTHROPIC_API_KEY',
        label: 'Anthropic API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
      },
      {
        name: 'TAVILY_API_KEY',
        label: 'Tavily API Key',
        type: 'password',
        required: true,
        placeholder: 'tvly-...',
      },
    ],
  },
  
  // Generic SSE Template
  {
    id: 'custom-sse',
    name: 'Custom SSE Server',
    description: 'Connect to any SSE-based MCP server',
    icon: '🌐',
    category: 'utility',
    transport: {
      type: 'sse',
      url: 'https://your-mcp-server.com/mcp',
    },
    setupInstructions: 'Replace with your actual SSE MCP server URL',
  },
];

// Utility Types
export type MCPServerStatus = 'active' | 'inactive' | 'error' | 'connecting';

export interface MCPHealthCheck {
  serverId: string;
  status: MCPServerStatus;
  responseTime?: number;
  lastCheck: Date;
  toolsAvailable: number;
  error?: string;
}