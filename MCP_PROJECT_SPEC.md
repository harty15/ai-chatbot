# MCP Integration Project Specification

## Overview
This document outlines the implementation of Model Context Protocol (MCP) integration into the AI Chatbot application. The goal is to create a comprehensive system that allows users to configure, manage, and use MCP servers with their chat conversations.

## Project Goals
- **User-specific MCP configurations**: Each user can configure their own MCP servers
- **Dynamic tool management**: Users can enable/disable individual MCP servers and their tools
- **Secure credential management**: Encrypted storage of API keys and authentication data
- **Marketplace integration**: Both curated and user-defined MCP servers
- **Seamless chat integration**: MCP tools automatically available in chat when enabled
- **Remote server support**: Focus on remote MCP servers rather than local execution

## Architecture Overview

### Database Schema Changes
New tables to be added to support MCP functionality:

```sql
-- MCP Server definitions (curated + user-defined)
CREATE TABLE mcp_server (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  transport_type VARCHAR(20) NOT NULL, -- 'sse', 'stdio_proxy'
  transport_config JSON NOT NULL, -- URL, command, args, etc.
  schema_config JSON, -- Tool schemas if defined
  created_by_user_id UUID REFERENCES "User"(id),
  is_public BOOLEAN DEFAULT false,
  is_curated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User's MCP server configurations
CREATE TABLE user_mcp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id),
  mcp_server_id UUID NOT NULL REFERENCES mcp_server(id),
  enabled BOOLEAN DEFAULT false,
  encrypted_credentials TEXT, -- Encrypted JSON of auth data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mcp_server_id)
);

-- User's tool-level configurations
CREATE TABLE user_mcp_tool_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id),
  mcp_server_id UUID NOT NULL REFERENCES mcp_server(id),
  tool_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mcp_server_id, tool_name)
);
```

### Frontend Pages & Components

#### 1. MCP Management Page (`/mcps`)
- **Location**: New page accessible from sidebar (under Memory page)
- **Functionality**: 
  - Display user's configured MCP servers as cards
  - Show enabled/disabled status
  - Quick enable/disable toggles
  - Link to individual MCP configuration
  - "Add MCP" button leading to marketplace

#### 2. MCP Marketplace Page (`/marketplace`)
- **Location**: Separate page for discovering MCPs
- **Functionality**:
  - Grid of available MCP servers (curated + public user-created)
  - Search and filter capabilities
  - "Add to My MCPs" functionality
  - Custom MCP creation via JSON upload
  - Tool previews for each MCP

#### 3. Settings Page with Credentials Tab (`/settings`)
- **Location**: New settings page
- **Tabs**: 
  - **General**: User preferences
  - **Credentials**: Manage MCP authentication data
- **Credentials Tab Functionality**:
  - List all MCP servers requiring authentication
  - Secure credential input forms (per MCP requirements)
  - Test connection functionality
  - Encrypted storage indication

#### 4. Chat Integration Components

##### MCP Settings Menu (Chat Input Area)
- **Location**: Near the chat input, similar to file upload button
- **UI**: Settings icon that opens dropdown menu (like the screenshot)
- **Functionality**:
  - List all user's MCP servers
  - Quick enable/disable toggles
  - Show active tool count per MCP
  - Visual indicator of active MCPs

##### MCP Status Indicator
- **Location**: Small badge/indicator near MCP settings button
- **Functionality**:
  - Show count of active MCP tools
  - Visual feedback when MCPs are processing

### Backend Implementation

#### 1. API Endpoints

```typescript
// MCP Server Management
GET /api/mcp/servers          // Get user's MCP configurations
POST /api/mcp/servers         // Add MCP server to user's config
PUT /api/mcp/servers/:id      // Update MCP server config
DELETE /api/mcp/servers/:id   // Remove MCP server from user

// MCP Marketplace
GET /api/mcp/marketplace      // Get available MCP servers
POST /api/mcp/marketplace     // Create custom MCP server

// Tool Management
GET /api/mcp/tools/:serverId  // Get tools for MCP server
PUT /api/mcp/tools/:serverId  // Update tool configurations

// Credentials Management
PUT /api/mcp/credentials/:serverId  // Update encrypted credentials
POST /api/mcp/test/:serverId        // Test MCP connection

// Chat Integration
POST /api/chat                // Enhanced with MCP tool integration
```

#### 2. MCP Client Management

```typescript
// lib/ai/mcp/client-manager.ts
class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  
  async getOrCreateClient(userId: string, mcpServerId: string): Promise<MCPClient>
  async getUserMCPTools(userId: string): Promise<Tool[]>
  async closeCleint(clientId: string): Promise<void>
}
```

#### 3. Tool Integration

```typescript
// lib/ai/tools/mcp-tools.ts
export async function getMCPTools(userId: string): Promise<Tool[]> {
  // Fetch user's enabled MCP configurations
  // Create MCP clients for enabled servers
  // Return combined tool array for AI SDK
}
```

#### 4. Enhanced Chat API
- **Modify**: `/api/chat` endpoint to include MCP tools
- **Integration**: Fetch user's enabled MCP tools and include in chat requests
- **Error Handling**: Graceful fallback when MCP servers are unavailable

### Security Considerations

#### 1. Credential Encryption
- Use strong encryption for storing API keys and sensitive data
- Environment variable for encryption key
- Per-user encryption salts

#### 2. MCP Server Validation
- Validate MCP server configurations before saving
- Sanitize user-provided JSON configurations
- Rate limiting on MCP server connections

#### 3. Access Control
- Users can only access their own MCP configurations
- Public MCP servers visible to all users
- Curated MCPs managed by administrators

### Implementation Phases

#### Phase 1: Database & Core Backend
1. Create database migrations for MCP tables
2. Implement basic CRUD operations for MCP servers
3. Set up credential encryption system
4. Create MCP client manager

#### Phase 2: MCP Management Page
1. Create `/mcps` page with user's MCP configurations
2. Implement MCP card components
3. Add enable/disable functionality
4. Create MCP configuration dialogs

#### Phase 3: Marketplace & Custom MCPs
1. Create `/marketplace` page
2. Implement MCP discovery interface
3. Add custom MCP creation (JSON upload)
4. Tool preview functionality

#### Phase 4: Settings & Credentials
1. Create `/settings` page structure
2. Implement credentials management tab
3. Add secure credential input forms
4. Connection testing functionality

#### Phase 5: Chat Integration
1. Add MCP settings menu to chat input area
2. Implement MCP status indicators
3. Integrate MCP tools into chat API
4. Add error handling and fallbacks

#### Phase 6: Polish & Optimization
1. Performance optimization
2. Enhanced error handling
3. User experience improvements
4. Documentation and help text

### Technical Dependencies

#### AI SDK Updates
- Update to latest AI SDK version with MCP support
- Implement experimental MCP client functionality

#### New Dependencies
```json
{
  "dependencies": {
    "crypto": "^1.0.1", // For credential encryption
    "@modelcontextprotocol/sdk": "^latest" // Official MCP SDK if needed
  }
}
```

### File Structure

```
lib/ai/mcp/
├── client-manager.ts      // MCP client lifecycle management
├── encryption.ts          // Credential encryption utilities
├── types.ts              // MCP-related TypeScript types
└── validators.ts         // MCP configuration validation

app/(chat)/
├── mcps/
│   └── page.tsx          // MCP management page
├── marketplace/
│   └── page.tsx          // MCP marketplace page
└── settings/
    └── page.tsx          // Settings page with credentials tab

components/
├── mcp-settings-menu.tsx // Chat MCP settings dropdown
├── mcp-card.tsx          // MCP server card component
├── mcp-credentials-form.tsx // Credential input forms
└── mcp-tool-toggle.tsx   // Individual tool enable/disable

api/mcp/
├── servers/
│   ├── route.ts          // MCP server CRUD
│   └── [id]/route.ts     // Individual server operations
├── marketplace/
│   └── route.ts          // Marketplace operations
├── tools/
│   └── [serverId]/route.ts // Tool management
└── credentials/
    └── [serverId]/route.ts // Credential management
```

### User Experience Flow

1. **Discovery**: User visits marketplace, finds interesting MCP server
2. **Configuration**: User adds MCP to their account, configures credentials
3. **Management**: User enables MCP and specific tools in `/mcps` page
4. **Usage**: In chat, user can see active MCPs and toggle them via settings menu
5. **Chat Integration**: MCP tools automatically available when user chats

### Future Enhancements

- **Analytics**: Usage tracking for MCP tools and servers
- **Monetization**: Payment processing for premium MCP servers
- **Collaboration**: Sharing MCP configurations between users
- **Advanced Configuration**: Per-chat MCP configurations
- **Monitoring**: Health monitoring for MCP servers
- **Caching**: Intelligent caching of MCP responses

## Success Metrics

- User adoption rate of MCP functionality
- Number of active MCP configurations per user
- Chat completion success rate with MCP tools
- User retention improvement with MCP features
- Community-created MCP server submissions

---

This specification serves as the foundation for implementing comprehensive MCP integration into the AI Chatbot platform, enabling users to extend their chat capabilities with external tools and services through the Model Context Protocol standard. 