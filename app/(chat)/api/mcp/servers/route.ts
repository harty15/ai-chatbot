import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  createMcpServer,
  getMcpServersByUserId,
  getMcpDashboardStats,
} from '@/lib/db/queries';
import { mcpClientManager } from '@/lib/ai/mcp-client';
import type { MCPServerFormData } from '@/lib/ai/mcp-types';
import { z } from 'zod';

const createServerSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100),
  description: z.string().optional(),
  transportType: z.enum(['stdio', 'sse']),
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
 * GET /api/mcp/servers
 * Get all MCP servers for the authenticated user
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    const servers = await getMcpServersByUserId({
      userId: session.user.id,
    });

    // Get connection states from the MCP client manager
    const connectionStates = mcpClientManager.getAllConnectionStates();

    // Combine server data with connection states
    const serversWithState = servers.map((server) => ({
      ...server,
      connectionState: connectionStates[server.id] || {
        status: 'disconnected' as const,
        availableTools: [],
        retryCount: 0,
      },
    }));

    return Response.json({ servers: serversWithState });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError('internal:mcp', 'Failed to get MCP servers').toResponse();
  }
}

/**
 * POST /api/mcp/servers
 * Create a new MCP server
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    const json = await request.json();
    const validatedData = createServerSchema.parse(json);

    // Validate transport-specific requirements
    if (validatedData.transportType === 'stdio' && !validatedData.command) {
      return new ChatSDKError(
        'bad_request:mcp',
        'Command is required for stdio transport',
      ).toResponse();
    }

    if (validatedData.transportType === 'sse' && !validatedData.url) {
      return new ChatSDKError(
        'bad_request:mcp',
        'URL is required for SSE transport',
      ).toResponse();
    }

    // Create server in database
    const server = await createMcpServer({
      userId: session.user.id,
      ...validatedData,
    });

    // Add server to MCP client manager if enabled
    if (validatedData.isEnabled !== false) {
      try {
        const transport = validatedData.transportType === 'stdio' 
          ? {
              type: 'stdio' as const,
              command: validatedData.command!,
              args: validatedData.args,
              env: validatedData.env,
            }
          : {
              type: 'sse' as const,
              url: validatedData.url!,
            };

        await mcpClientManager.addServer(server.id, {
          transport,
          timeout: validatedData.timeout,
          maxRetries: validatedData.maxRetries,
          retryDelay: validatedData.retryDelay,
        });

        // Attempt to connect to the server
        const client = mcpClientManager.getClient(server.id);
        if (client) {
          client.connect().catch((error) => {
            console.error(`Failed to connect to MCP server ${server.id}:`, error);
          });
        }
      } catch (error) {
        console.error(`Failed to add MCP server to client manager:`, error);
        // Don't fail the creation if client manager fails
      }
    }

    return Response.json({ server }, { status: 201 });
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

    console.error('Error creating MCP server:', error);
    return new ChatSDKError('internal:mcp', 'Failed to create MCP server').toResponse();
  }
}