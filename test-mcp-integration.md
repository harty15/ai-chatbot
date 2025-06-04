# MCP Integration Test Plan

## What Has Been Implemented

### 1. Database Schema ✅
- `MCPServer` table for storing MCP server configurations
- `UserMCPConfig` table for user-specific MCP configurations
- `UserMCPToolConfig` table for granular tool control
- Migration `0009_tiny_doctor_faustus.sql` successfully created

### 2. Core Infrastructure ✅
- **Types** (`lib/ai/mcp/types.ts`): Complete TypeScript interfaces
- **Encryption** (`lib/ai/mcp/encryption.ts`): AES-256-GCM credential encryption
- **Database Queries** (`lib/db/queries/mcp.ts`): Full CRUD operations
- **Client Manager** (`lib/ai/mcp/client-manager.ts`): Connection pooling and lifecycle management

### 3. API Endpoints ✅
- `GET/POST /api/mcp/servers`: List and create MCP configurations
- `GET/PUT/DELETE /api/mcp/servers/[id]`: Individual MCP management
- `PUT /api/mcp/credentials/[serverId]`: Credential management
- `POST /api/mcp/test/[serverId]`: Connection testing

### 4. Frontend Pages ✅
- **MCP Management** (`/mcps`): Card-based UI for managing MCPs
- **Marketplace** (`/marketplace`): Browse and add MCP servers
- **Settings** (`/settings`): Credentials management with tabs

### 5. UI Components ✅
- **MCPSettingsMenu**: Chat toolbar integration with active tool count
- **MCPPage**: Main management interface
- **MarketplacePage**: Server discovery and installation
- **SettingsPage**: Credential configuration and testing
- **Missing UI Components**: Created Tabs and Alert components

### 6. Navigation Integration ✅
- Added MCPs and Settings links to sidebar
- Integrated MCP settings menu in chat header

## Test Scenarios

### 1. Basic Navigation Test
1. Start development server: `npm run dev`
2. Navigate to `/mcps` - should show empty state
3. Navigate to `/marketplace` - should show sample servers
4. Navigate to `/settings` - should show tabs interface

### 2. Database Connection Test
1. Run migrations: `npm run db:migrate` ✅
2. Seed sample data: `npx tsx lib/db/seed-mcp.ts` ❌ (DB connection issue)

### 3. MCP Configuration Test
1. Add an MCP server from marketplace
2. Configure credentials in settings
3. Test connection
4. Enable/disable in chat settings menu

### 4. Chat Integration Test
1. Open chat interface
2. Check MCP settings button in header
3. Verify tool count badge appears when MCPs are enabled

## Known Issues

### 1. Database Connection ❌
- Error: `database "ryanharty" does not exist`
- Need to configure proper database connection
- Environment variables may need adjustment

### 2. MCP Server Transport ⚠️
- Only SSE transport implemented
- stdio_proxy transport marked as "not yet implemented"
- Need actual MCP server endpoints for testing

### 3. Credential Encryption 🔄
- Implementation exists but needs testing
- User-specific salt generation needs verification

## Next Steps

### Immediate (Critical)
1. **Fix Database Connection**
   - Check POSTGRES_URL environment variable
   - Ensure database exists and is accessible
   - Test with local PostgreSQL instance

2. **Test MCP Server Integration**
   - Set up test MCP server (SSE endpoint)
   - Verify client connection and tool discovery
   - Test actual tool execution in chat

### Short Term (Important)
3. **Complete Marketplace Functionality**
   - Add custom MCP server upload
   - Implement server validation
   - Add server ratings/reviews

4. **Enhanced Security**
   - Test credential encryption/decryption
   - Add credential validation
   - Implement secure credential storage

### Long Term (Nice to Have)
5. **Advanced Features**
   - stdio_proxy transport support
   - MCP server health monitoring
   - Tool usage analytics
   - Bulk MCP operations

## File Structure Summary

```
lib/ai/mcp/
├── types.ts              # TypeScript interfaces
├── encryption.ts         # Credential encryption
└── client-manager.ts     # MCP client lifecycle

lib/db/
├── schema.ts            # Database schema (MCP tables added)
├── queries/mcp.ts       # MCP database operations
└── seed-mcp.ts          # Sample data seeding

app/(chat)/
├── mcps/page.tsx        # MCP management page
├── marketplace/page.tsx # MCP marketplace
├── settings/page.tsx    # Settings with credentials
└── api/mcp/            # MCP API endpoints

components/
├── mcp-page.tsx         # MCP management UI
├── marketplace-page.tsx # Marketplace UI
├── settings-page.tsx    # Settings UI
├── mcp-settings-menu.tsx # Chat integration
└── ui/                  # Missing components added
    ├── tabs.tsx
    └── alert.tsx
```

## Success Criteria

- [ ] Database connection working
- [ ] MCP servers can be added and configured
- [ ] Credentials can be saved and tested
- [ ] MCPs appear in chat settings menu
- [ ] Tool count badge shows correctly
- [ ] Connection testing works
- [ ] Sample MCP server integration successful

## Current Status: 🟡 Partially Complete

The infrastructure is fully implemented but requires database connectivity and actual MCP server testing to be fully functional. 