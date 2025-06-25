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
  action: z.enum(['connect', 'disconnect', 'reconnect', 'test']),
});

export const maxDuration = 30;

/**
 * POST /api/mcp/servers/[id]/connect
 * Connect, disconnect, reconnect, or test MCP server connection
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  let json: any;
  let resolvedParams: { id: string };

  try {
    json = await request.json();
    resolvedParams = await params;
    console.log(
      `🔌 MCP Connection request: ${json.action} for server ${resolvedParams.id}`,
    );
  } catch (error) {
    console.error('❌ Failed to parse request:', error);
    return new ChatSDKError(
      'bad_request:mcp',
      'Invalid request format',
    ).toResponse();
  }

  try {
    const { action } = actionSchema.parse(json);

    // Check if server exists and belongs to user
    const server = await getMcpServerById({
      id: resolvedParams.id,
      userId: session.user.id,
    });

    if (!server) {
      console.error(`❌ Server not found: ${resolvedParams.id}`);
      return new ChatSDKError(
        'not_found:mcp',
        'MCP server not found',
      ).toResponse();
    }

    console.log(`🔍 Server found: ${server.name} (${server.transportType})`);
    console.log(
      `   - URL/Command: ${server.transportType === 'sse' ? server.url : server.command}`,
    );
    console.log(`   - Enabled: ${server.isEnabled}`);
    console.log(`   - Current status: ${server.connectionStatus}`);

    // Validate server configuration
    if (server.transportType === 'sse' && !server.url) {
      return new ChatSDKError(
        'bad_request:mcp',
        'SSE server missing URL',
      ).toResponse();
    }

    if (server.transportType === 'stdio' && !server.command) {
      return new ChatSDKError(
        'bad_request:mcp',
        'STDIO server missing command',
      ).toResponse();
    }

    if (!server.isEnabled && action !== 'test') {
      return new ChatSDKError(
        'bad_request:mcp',
        'Cannot connect to disabled server. Enable the server first.',
      ).toResponse();
    }

    let client = mcpClientManager.getClient(resolvedParams.id);

    switch (action) {
      case 'test': {
        console.log(`🧪 Testing connection for server ${server.name}...`);

        try {
          // Create a temporary client for testing
          const transport =
            server.transportType === 'stdio'
              ? {
                  type: 'stdio' as const,
                  command: server.command || '',
                  args: server.args || undefined,
                  env: server.env || undefined,
                }
              : {
                  type: 'sse' as const,
                  url: server.url || '',
                };

          const testClient = await mcpClientManager.addServer(
            `${resolvedParams.id}-test`,
            {
              transport,
              timeout: Math.min(server.timeout || 5000, 10000), // Shorter timeout for testing
              maxRetries: 1, // Single retry for testing
              retryDelay: server.retryDelay,
            },
          );

          await testClient.connect();
          const tools = testClient.getAvailableTools();

          // Clean up test client
          await testClient.disconnect();
          await mcpClientManager.removeServer(`${resolvedParams.id}-test`);

          console.log(
            `✅ Connection test successful: ${tools.length} tools available`,
          );

          return Response.json({
            action: 'test',
            success: true,
            message: `Connection test successful! ${tools.length} tools available`,
            testResults: {
              toolCount: tools.length,
              tools: tools.map((t) => ({
                name: t.name,
                description: t.description,
              })),
              responseTime: Date.now(), // Simplified for now
            },
          });
        } catch (testError) {
          console.error(`❌ Connection test failed:`, testError);
          return Response.json({
            action: 'test',
            success: false,
            error:
              testError instanceof Error
                ? testError.message
                : 'Unknown test error',
            message: `Connection test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`,
          });
        }
      }

      case 'connect': {
        // Check both database status AND actual client connection
        const isActuallyConnected = client?.isConnected() || false;
        const dbSaysConnected = server.connectionStatus === 'connected';
        const dbSaysDisconnected = server.connectionStatus === 'disconnected';

        // Handle state mismatch scenarios
        if (dbSaysConnected && !isActuallyConnected) {
          console.log(
            `🔄 State mismatch detected: DB says connected but client isn't. Cleaning up...`,
          );

          // Clean up stale client if exists
          if (client) {
            try {
              await client.disconnect();
              await mcpClientManager.removeServer(resolvedParams.id);
            } catch (cleanupError) {
              console.log(`⚠️  Cleanup warning: ${cleanupError}`);
            }
            client = undefined;
          }

          // Reset database status to match reality
          await updateMcpServer({
            id: resolvedParams.id,
            userId: session.user.id,
            connectionStatus: 'disconnected',
            lastError: undefined,
          });

          console.log(
            `✅ State synchronized: Both DB and client now show disconnected`,
          );
        } else if (dbSaysDisconnected && isActuallyConnected) {
          console.log(
            `🔄 State mismatch detected: DB says disconnected but client is connected. Syncing...`,
          );

          // Update database to match client reality
          await updateMcpServer({
            id: resolvedParams.id,
            userId: session.user.id,
            connectionStatus: 'connected',
            lastConnected: new Date(),
            lastError: undefined,
          });

          // Sync tools with database
          await syncServerTools(resolvedParams.id, client);

          console.log(
            `✅ State synchronized: Both DB and client now show connected`,
          );

          // Return success since connection is already established
          const connectionState = client?.getConnectionState() || {
            status: 'connected' as const,
            availableTools: [],
            retryCount: 0,
          };
          
          // Fetch updated server data
          const updatedServer = await getMcpServerById({
            id: resolvedParams.id,
            userId: session.user.id,
          });
          
          return Response.json({
            action: 'connect',
            connectionState,
            server: {
              ...updatedServer,
              connectionState,
            },
            message: `Server ${server.name} was already connected - state synchronized`,
            success: true,
          });
        } else if (isActuallyConnected) {
          console.log(`⚠️  Server ${server.name} is already connected`);
          return new ChatSDKError(
            'bad_request:mcp',
            'Server is already connected',
          ).toResponse();
        }

        console.log(`🔌 Connecting to server ${server.name}...`);

        // Add to client manager if not already added
        if (!client) {
          const transport =
            server.transportType === 'stdio'
              ? {
                  type: 'stdio' as const,
                  command: server.command || '',
                  args: server.args || undefined,
                  env: server.env || undefined,
                }
              : {
                  type: 'sse' as const,
                  url: server.url || '',
                };

          console.log(
            `📝 Adding server to client manager with transport:`,
            transport,
          );

          client = await mcpClientManager.addServer(resolvedParams.id, {
            transport,
            timeout: server.timeout,
            maxRetries: server.maxRetries,
            retryDelay: server.retryDelay,
          });
        }

        // Attempt connection
        await client.connect();
        console.log(`✅ Successfully connected to ${server.name}`);

        // Update server status in database
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'connected',
          lastConnected: new Date(),
          lastError: undefined,
        });

        // Sync tools with database
        await syncServerTools(resolvedParams.id, client);

        break;
      }

      case 'disconnect': {
        console.log(`🔌 Disconnecting from server ${server.name}...`);

        if (client) {
          await client.disconnect();
          console.log(`✅ Successfully disconnected from ${server.name}`);
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
        console.log(`🔄 Reconnecting to server ${server.name}...`);

        if (client) {
          await client.disconnect();
          await mcpClientManager.removeServer(resolvedParams.id);
        }

        // Re-add to client manager
        const transport =
          server.transportType === 'stdio'
            ? {
                type: 'stdio' as const,
                command: server.command || '',
                args: server.args || undefined,
                env: server.env || undefined,
              }
            : {
                type: 'sse' as const,
                url: server.url || '',
              };

        client = await mcpClientManager.addServer(resolvedParams.id, {
          transport,
          timeout: server.timeout,
          maxRetries: server.maxRetries,
          retryDelay: server.retryDelay,
        });

        // Attempt connection
        await client.connect();
        console.log(`✅ Successfully reconnected to ${server.name}`);

        // Update server status in database
        await updateMcpServer({
          id: resolvedParams.id,
          userId: session.user.id,
          connectionStatus: 'connected',
          lastConnected: new Date(),
          lastError: undefined,
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

    console.log(`📊 Final connection state:`, {
      status: connectionState.status,
      toolCount: connectionState.availableTools?.length || 0,
    });

    // Fetch updated server data to return complete server object
    const updatedServer = await getMcpServerById({
      id: resolvedParams.id,
      userId: session.user.id,
    });

    return Response.json({
      action,
      connectionState,
      server: {
        ...updatedServer,
        connectionState,
      },
      message: `Server ${action} successful`,
      success: true,
    });
  } catch (error) {
    console.error(
      `❌ Error during ${json?.action || 'unknown'} action:`,
      error,
    );

    if (error instanceof z.ZodError) {
      return new ChatSDKError(
        'bad_request:mcp',
        `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
      ).toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Update server status to error in database
    try {
      await updateMcpServer({
        id: resolvedParams.id,
        userId: session.user.id,
        connectionStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (dbError) {
      console.error('Failed to update server status to error:', dbError);
    }

    // Provide user-friendly error messages
    let userMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout') || message.includes('econnrefused')) {
        userMessage =
          'Connection timeout - server may be offline or unreachable';
      } else if (message.includes('enotfound') || message.includes('dns')) {
        userMessage = 'Server not found - check the URL or hostname';
      } else if (message.includes('certificate') || message.includes('ssl')) {
        userMessage = 'SSL/Certificate error - check server security settings';
      } else if (
        message.includes('permission') ||
        message.includes('forbidden')
      ) {
        userMessage = 'Permission denied - check server authentication';
      } else {
        userMessage = error.message;
      }
    }

    return new ChatSDKError(
      'internal:mcp',
      `Failed to ${json?.action || 'connect'} MCP server: ${userMessage}`,
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

    console.log(
      `✅ Synced ${availableTools.length} tools for server ${serverId}`,
    );
  } catch (error) {
    console.error(`❌ Failed to sync tools for server ${serverId}:`, error);
    // Don't throw - tool sync failure shouldn't fail the connection
  }
}
