import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  getMcpServerById,
  updateMcpServer,
  deleteMcpServer,
  getMcpToolsByServerId,
  deleteMcpToolsByServerId,
} from '@/lib/db/queries';
import { mcpClientManager } from '@/lib/ai/mcp-client';
import { z } from 'zod';

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  transportType: z.enum(['stdio', 'sse']).optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().url().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  retryDelay: z.number().min(100).max(10000).optional(),
  timeout: z.number().min(5000).max(60000).optional(),
  isEnabled: z.boolean().optional(),
});

export const maxDuration = 30;

/**
 * GET /api/mcp/servers/[id]
 * Get a specific MCP server with tools
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    const server = await getMcpServerById({
      id: params.id,
      userId: session.user.id,
    });

    if (!server) {
      return new ChatSDKError('not_found:mcp', 'MCP server not found').toResponse();
    }

    // Get tools for this server
    const tools = await getMcpToolsByServerId({ serverId: params.id });

    // Get connection state from client manager
    const client = mcpClientManager.getClient(params.id);
    const connectionState = client?.getConnectionState() || {
      status: 'disconnected' as const,
      availableTools: [],
      retryCount: 0,
    };

    const serverWithDetails = {
      ...server,
      tools,
      toolCount: tools.length,
      connectionState,
    };

    return Response.json({ server: serverWithDetails });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('internal:mcp', 'Failed to get MCP server').toResponse();
  }
}

/**
 * PATCH /api/mcp/servers/[id]
 * Update a specific MCP server
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    const json = await request.json();
    const validatedData = updateServerSchema.parse(json);

    // Check if server exists and belongs to user
    const existingServer = await getMcpServerById({
      id: params.id,
      userId: session.user.id,
    });

    if (!existingServer) {
      return new ChatSDKError('not_found:mcp', 'MCP server not found').toResponse();
    }

    // Update server in database
    const updatedServer = await updateMcpServer({
      id: params.id,
      userId: session.user.id,
      ...validatedData,
    });

    if (!updatedServer) {
      return new ChatSDKError('not_found:mcp', 'MCP server not found').toResponse();
    }

    // Update client manager if configuration changed
    const client = mcpClientManager.getClient(params.id);
    
    if (client) {
      // If server was disabled, disconnect and remove from manager
      if (validatedData.isEnabled === false) {
        await client.disconnect();
        await mcpClientManager.removeServer(params.id);
      } else {
        // If configuration changed, reconnect
        const configChanged = 
          validatedData.transportType !== undefined ||
          validatedData.command !== undefined ||
          validatedData.args !== undefined ||
          validatedData.env !== undefined ||
          validatedData.url !== undefined ||
          validatedData.timeout !== undefined ||
          validatedData.maxRetries !== undefined ||
          validatedData.retryDelay !== undefined;

        if (configChanged) {
          await client.disconnect();
          await mcpClientManager.removeServer(params.id);

          // Re-add with new configuration
          const transport = updatedServer.transportType === 'stdio' 
            ? {
                type: 'stdio' as const,
                command: updatedServer.command!,
                args: updatedServer.args || undefined,
                env: updatedServer.env || undefined,
              }
            : {
                type: 'sse' as const,
                url: updatedServer.url!,
              };

          await mcpClientManager.addServer(params.id, {
            transport,
            timeout: updatedServer.timeout,
            maxRetries: updatedServer.maxRetries,
            retryDelay: updatedServer.retryDelay,
          });

          // Attempt to connect
          const newClient = mcpClientManager.getClient(params.id);
          if (newClient) {
            newClient.connect().catch((error) => {
              console.error(`Failed to reconnect to MCP server ${params.id}:`, error);
            });
          }
        }
      }
    } else if (validatedData.isEnabled !== false && updatedServer.isEnabled) {
      // Server was enabled but not in client manager, add it
      try {
        const transport = updatedServer.transportType === 'stdio' 
          ? {
              type: 'stdio' as const,
              command: updatedServer.command!,
              args: updatedServer.args || undefined,
              env: updatedServer.env || undefined,
            }
          : {
              type: 'sse' as const,
              url: updatedServer.url!,
            };

        await mcpClientManager.addServer(params.id, {
          transport,
          timeout: updatedServer.timeout,
          maxRetries: updatedServer.maxRetries,
          retryDelay: updatedServer.retryDelay,
        });

        const newClient = mcpClientManager.getClient(params.id);
        if (newClient) {
          newClient.connect().catch((error) => {
            console.error(`Failed to connect to MCP server ${params.id}:`, error);
          });
        }
      } catch (error) {
        console.error(`Failed to add updated MCP server to client manager:`, error);
      }
    }

    return Response.json({ server: updatedServer });
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

    console.error('Error updating MCP server:', error);
    return new ChatSDKError('internal:mcp', 'Failed to update MCP server').toResponse();
  }
}

/**
 * DELETE /api/mcp/servers/[id]
 * Delete a specific MCP server
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    // Check if server exists and belongs to user
    const existingServer = await getMcpServerById({
      id: params.id,
      userId: session.user.id,
    });

    if (!existingServer) {
      return new ChatSDKError('not_found:mcp', 'MCP server not found').toResponse();
    }

    // Disconnect and remove from client manager
    const client = mcpClientManager.getClient(params.id);
    if (client) {
      await client.disconnect();
      await mcpClientManager.removeServer(params.id);
    }

    // Delete tools first (handled by database cascade, but explicit for clarity)
    await deleteMcpToolsByServerId({ serverId: params.id });

    // Delete server from database
    const deletedServer = await deleteMcpServer({
      id: params.id,
      userId: session.user.id,
    });

    return Response.json({ server: deletedServer });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error('Error deleting MCP server:', error);
    return new ChatSDKError('internal:mcp', 'Failed to delete MCP server').toResponse();
  }
}