import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  getMcpServerById,
  updateMcpServer,
  createMcpTool,
  deleteMcpToolsByServerId,
} from '@/lib/db/queries';
import { mcpClientManager } from '@/lib/ai/mcp-client';
import { z } from 'zod';

const actionSchema = z.object({
  action: z.enum(['connect', 'disconnect', 'reconnect']),
});

export const maxDuration = 30;

/**
 * POST /api/mcp/servers/[id]/connect
 * Connect, disconnect, or reconnect to an MCP server
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
    const { action } = actionSchema.parse(json);
    const resolvedParams = await params;

    // Check if server exists and belongs to user
    const server = await getMcpServerById({
      id: resolvedParams.id,
      userId: session.user.id,
    });

    if (!server) {
      return new ChatSDKError('not_found:mcp', 'MCP server not found').toResponse();
    }

    if (!server.isEnabled) {
      return new ChatSDKError(
        'bad_request:mcp',
        'Cannot connect to disabled server',
      ).toResponse();
    }

    let client = mcpClientManager.getClient(resolvedParams.id);

    switch (action) {
      case 'connect': {
        if (client && client.isConnected()) {
          return new ChatSDKError(
            'bad_request:mcp',
            'Server is already connected',
          ).toResponse();
        }

        // Add to client manager if not already added
        if (!client) {
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

          client = await mcpClientManager.addServer(resolvedParams.id, {
            transport,
            timeout: server.timeout,
            maxRetries: server.maxRetries,
            retryDelay: server.retryDelay,
          });
        }

        // Attempt connection
        await client.connect();

        // Update server status in database
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'connected',
          lastConnected: new Date(),
          lastError: null,
        });

        // Sync tools with database
        await syncServerTools(resolvedParams.id, client);

        break;
      }

      case 'disconnect': {
        if (client) {
          await client.disconnect();
        }

        // Update server status in database
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'disconnected',
        });

        break;
      }

      case 'reconnect': {
        if (client) {
          await client.disconnect();
          await mcpClientManager.removeServer(resolvedParams.id);
        }

        // Re-add to client manager
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

        client = await mcpClientManager.addServer(resolvedParams.id, {
          transport,
          timeout: server.timeout,
          maxRetries: server.maxRetries,
          retryDelay: server.retryDelay,
        });

        // Attempt connection
        await client.connect();

        // Update server status in database
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'connected',
          lastConnected: new Date(),
          lastError: null,
        });

        // Sync tools with database
        await syncServerTools(resolvedParams.id, client);

        break;
      }
    }

    // Get updated connection state
    const connectionState = client?.getConnectionState() || {
      status: 'disconnected' as const,
      availableTools: [],
      retryCount: 0,
    };

    return Response.json({
      action,
      connectionState,
      message: `Server ${action} successful`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError(
        'bad_request:mcp',
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
      ).toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Update server status to error in database
    try {
      await updateMcpServer({
        id: params.id,
        userId: session.user.id,
        connectionStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error('Failed to update server status to error:', dbError);
    }

    console.error(`Error ${json?.action || 'connecting'} MCP server:`, error);
    return new ChatSDKError(
      'internal:mcp',
      `Failed to ${json?.action || 'connect'} MCP server: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    ).toResponse();
  }
}

/**
 * Sync tools from MCP server with database
 */
async function syncServerTools(serverId: string, client: any): Promise<void> {
  try {
    const availableTools = client.getAvailableTools();

    // Clear existing tools
    await deleteMcpToolsByServerId({ serverId });

    // Add new tools
    for (const tool of availableTools) {
      await createMcpTool({
        serverId,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        isEnabled: true,
      });
    }

    console.log(`Synced ${availableTools.length} tools for server ${serverId}`);
  } catch (error) {
    console.error(`Failed to sync tools for server ${serverId}:`, error);
    // Don't throw - tool sync failure shouldn't fail the connection
  }
}