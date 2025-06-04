export interface MCPTransportConfig {
  type: 'sse' | 'stdio_proxy';
  url?: string; // For SSE transport
  command?: string; // For stdio_proxy transport
  args?: string[]; // For stdio_proxy transport
  headers?: Record<string, string>; // For SSE transport
  requiresApiKey?: boolean; // Whether this server requires API key authentication
  authType?: 'bearer' | 'basic' | 'custom'; // Authentication type
  envHeaders?: boolean; // Whether to use environment variables for headers (like Notion)
}

export interface MCPCredentials {
  [key: string]: string;
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  transportType: 'sse' | 'stdio_proxy';
  transportConfig: MCPTransportConfig;
  schemaConfig?: any;
  isPublic: boolean;
  isCurated: boolean;
  createdByUserId?: string;
  tools?: MCPToolInfo[];
}

export interface UserMCPConfiguration {
  id: string;
  userId: string;
  mcpServerId: string;
  enabled: boolean;
  credentials?: MCPCredentials;
  server: MCPServerInfo;
  toolConfigs: Array<{
    toolName: string;
    enabled: boolean;
  }>;
}

export interface MCPClientStatus {
  connected: boolean;
  error?: string;
  toolCount: number;
}
