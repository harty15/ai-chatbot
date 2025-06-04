# Notion MCP Integration Test

## Configuration Overview

The Notion MCP server has been successfully configured with the following settings:

### Transport Configuration
- **Type**: `stdio_proxy` (not SSE)
- **Command**: `npx`
- **Args**: `["-y", "@notionhq/notion-mcp-server"]`
- **Environment Variables**: Uses `OPENAPI_MCP_HEADERS` for authentication

### Authentication
- **API Key Required**: Yes
- **Format**: Bearer token (starts with `ntn_`)
- **Headers**: 
  - `Authorization: Bearer ntn_****`
  - `Notion-Version: 2022-06-28`

### Schema Configuration
The Notion MCP server includes explicit credential field definitions:

```json
{
  "credentialFields": [
    {
      "name": "apiKey",
      "label": "Notion API Key", 
      "type": "password",
      "required": true,
      "description": "Your Notion integration API key (starts with ntn_)",
      "placeholder": "ntn_****"
    }
  ]
}
```

## Implementation Details

### 1. Database Schema ✅
The updated seed configuration includes:

```typescript
{
  name: 'Notion API',
  description: 'Access and manage your Notion workspace - create pages, update databases, and search content.',
  iconUrl: 'https://www.notion.so/images/favicon.ico',
  transportType: 'stdio_proxy',
  transportConfig: {
    type: 'stdio_proxy',
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    requiresApiKey: true,
    authType: 'bearer',
    envHeaders: true
  },
  schemaConfig: {
    credentialFields: [/* ... */]
  },
  isCurated: true,
  isPublic: true
}
```

### 2. Client Manager Support ✅
The `MCPClientManager` now supports stdio_proxy transport:

```typescript
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
}
```

### 3. Settings UI Enhancement ✅
The settings page now supports schema-defined credential fields:

```typescript
const getCredentialFields = (transportConfig: any, schemaConfig?: any): CredentialField[] => {
  // First, check if the server has explicit credential field definitions
  if (schemaConfig?.credentialFields) {
    return schemaConfig.credentialFields;
  }
  // Fallback to parsing transport config...
};
```

## Test Scenarios

### 1. Marketplace Display
When users visit `/marketplace`, they should see:
- ✅ Notion API server card
- ✅ Proper icon and description
- ✅ "Curated" badge
- ✅ "Add MCP" button

### 2. MCP Configuration
When users add the Notion MCP:
- ✅ Should appear in `/mcps` page
- ✅ Should be disabled by default
- ✅ Should show in MCP settings menu (disabled)

### 3. Credentials Management
When users visit `/settings` and go to "MCP Credentials":
- ✅ Should show Notion API card
- ✅ Should display API Key field with proper labels
- ✅ Field should be type="password"
- ✅ Should show description "Your Notion integration API key (starts with ntn_)"
- ✅ Should show placeholder "ntn_****"

### 4. Connection Testing
When users enter their API key and click "Test Connection":
- ✅ Should call `/api/mcp/test/[serverId]` endpoint
- ✅ Should build proper environment variables
- ✅ Should include `OPENAPI_MCP_HEADERS` with Bearer token
- ✅ Should include `Notion-Version: 2022-06-28` header

### 5. Chat Integration
Once enabled and configured:
- ✅ Should appear in chat MCP settings menu
- ✅ Should show tool count badge when active
- ✅ Tools should be available to the AI SDK

## Expected User Flow

1. **Discovery**: User visits marketplace, sees Notion API server
2. **Installation**: User clicks "Add MCP", server is added to their account
3. **Configuration**: User goes to Settings → MCP Credentials
4. **Authentication**: User enters their Notion API key (ntn_****)
5. **Testing**: User clicks "Test Connection" to verify credentials
6. **Activation**: User enables the MCP in the chat settings menu
7. **Usage**: Notion tools become available in chat conversations

## Configuration Requirements

To test this integration, users will need:

1. **Notion Integration**: Create a Notion integration at https://www.notion.so/my-integrations
2. **API Key**: Copy the integration token (starts with `ntn_`)
3. **Permissions**: Grant the integration appropriate permissions to databases/pages
4. **npx Access**: Ensure the system can run `npx` commands (Node.js installed)

## Status: ✅ Ready for Testing

The Notion MCP integration is fully implemented and ready for testing once database connectivity is established. All the necessary components are in place:

- ✅ Database schema supports stdio_proxy transport
- ✅ Client manager handles Notion's authentication pattern
- ✅ Settings UI provides proper credential input
- ✅ Connection testing endpoint supports environment headers
- ✅ MCP configuration matches the provided specification

The implementation correctly handles the unique aspects of the Notion MCP server:
- Uses `stdio_proxy` instead of SSE transport
- Builds `OPENAPI_MCP_HEADERS` environment variable
- Includes required Notion-Version header
- Provides user-friendly credential input with validation 