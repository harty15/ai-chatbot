import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getMcpServerById, updateMcpServer } from '@/lib/db/queries';
import { mcpClientManager } from '@/lib/ai/mcp-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const toggleSchema = z.object({
  isEnabled: z.boolean(),
});

/**
 * POST /api/mcp/servers/[id]/toggle
 * Toggle MCP server enabled/disabled state
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    const json = await request.json();
    const { isEnabled } = toggleSchema.parse(json);
    const resolvedParams = await params;

    // Check if server exists and belongs to user
    const server = await getMcpServerById({
      id: resolvedParams.id,
      userId: session.user.id,
    });

    if (!server) {
      return new ChatSDKError('not_found:mcp', 'MCP server not found').toResponse();
    }

    // Update server enabled state in database
    await updateMcpServer({
      id: resolvedParams.id,
      userId: session.user.id,
      isEnabled,
      updatedAt: new Date(),
    });

    // Handle connection state based on toggle
    if (!isEnabled) {
      // Server disabled: disconnect gracefully
      await mcpClientManager.disconnectServer(resolvedParams.id);
      
      // Update connection status to disconnected
      await updateMcpServer({
        id: resolvedParams.id,
        userId: session.user.id,
        connectionStatus: 'disconnected',
      });
    } else if (isEnabled && server.connectionStatus === 'connected') {
      // Server enabled and was previously connected: attempt to reconnect
      try {
        // If client exists, reconnect it
        if (mcpClientManager.hasServer(resolvedParams.id)) {
          await mcpClientManager.reconnectServer(resolvedParams.id);
        } else {
          // Re-add to client manager if it doesn't exist
          const transport = server.transportType === 'stdio' 
            ? {
                type: 'stdio' as const,
                command: server.command!,
                args: server.args || undefined,
                env: server.env || undefined,
              }
            : {
                type: 'sse' as const,
                url: server.url!,
              };

          const newClient = await mcpClientManager.addServer(resolvedParams.id, {
            transport,
            timeout: server.timeout,
            maxRetries: server.maxRetries,
            retryDelay: server.retryDelay,
          });

          if (newClient) {
            await newClient.connect();
          }
        }
        
        // Update connection status
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'connected',
          lastConnected: new Date(),
        });
        
        console.log(`🔌 MCP Toggle: Reconnected server ${server.name} (${resolvedParams.id})`);
      } catch (error) {
        console.warn(`⚠️ MCP Toggle: Failed to reconnect server ${resolvedParams.id}:`, error);
        
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'error',
          lastError: error instanceof Error ? error.message : 'Failed to reconnect',
        });
      }
    }

    console.log(`🔄 MCP Toggle: Server ${server.name} ${isEnabled ? 'enabled' : 'disabled'}`);

    return Response.json({ 
      success: true,
      isEnabled,
      serverId: resolvedParams.id,
      serverName: server.name,
    });

  } catch (error) {
    console.error('❌ MCP Toggle: Failed to toggle server:', error);
    
    if (error instanceof z.ZodError) {
      return new ChatSDKError(
        'bad_request:validation',
        'Invalid toggle request data',
      ).toResponse();
    }

    return new ChatSDKError(
      'internal_server_error:mcp',
      'Failed to toggle MCP server',
    ).toResponse();
  }
}