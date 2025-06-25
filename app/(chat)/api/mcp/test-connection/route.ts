import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import type { MCPTransportConfig } from '@/lib/ai/mcp-types';
import { z } from 'zod';

const testConnectionSchema = z.object({
  transportType: z.enum(['stdio', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().url().optional(),
  timeout: z.number().min(1000).max(30000).optional(),
});

export const maxDuration = 30;

/**
 * POST /api/mcp/test-connection
 * Test MCP server connection without saving to database
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    const json = await request.json();
    const config = testConnectionSchema.parse(json);

    console.log('🔍 Testing MCP connection with config:', {
      transportType: config.transportType,
      url: config.transportType === 'sse' ? config.url : undefined,
      command: config.transportType === 'stdio' ? config.command : undefined,
      timeout: config.timeout || 10000,
    });

    // Validate transport-specific requirements
    if (config.transportType === 'stdio' && !config.command) {
      return Response.json({
        success: false,
        error: 'Command is required for stdio transport',
        diagnostics: {
          issue: 'missing_command',
          suggestion: 'Provide a valid command for stdio transport',
        },
      });
    }

    if (config.transportType === 'sse' && !config.url) {
      return Response.json({
        success: false,
        error: 'URL is required for SSE transport',
        diagnostics: {
          issue: 'missing_url',
          suggestion: 'Provide a valid URL for SSE transport',
        },
      });
    }

    // Create transport config
    const transport: MCPTransportConfig =
      config.transportType === 'stdio'
        ? {
            type: 'stdio',
            command: config.command!,
            args: config.args,
            env: config.env,
          }
        : {
            type: 'sse',
            url: config.url!,
          };

    // Test the connection
    const testResult = await testMCPConnection(
      transport,
      config.timeout || 10000,
    );

    return Response.json(testResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError(
        'bad_request:mcp',
        `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
      ).toResponse();
    }

    console.error('Error testing MCP connection:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      diagnostics: {
        issue: 'unexpected_error',
        suggestion: 'Check server logs for more details',
      },
    });
  }
}

/**
 * Test MCP connection with detailed diagnostics
 */
async function testMCPConnection(
  transport: MCPTransportConfig,
  timeout: number,
): Promise<{
  success: boolean;
  error?: string;
  connectionTime?: number;
  serverInfo?: any;
  tools?: any[];
  diagnostics: {
    issue?: string;
    suggestion?: string;
    networkReachable?: boolean;
    dnsResolved?: boolean;
    sslValid?: boolean;
    responseTime?: number;
  };
}> {
  const startTime = Date.now();
  const diagnostics: any = {};

  try {
    // Pre-flight checks for SSE transport
    if (transport.type === 'sse') {
      console.log(`🌐 Testing SSE URL: ${transport.url}`);

      try {
        // Test DNS resolution and basic connectivity
        const urlTest = new URL(transport.url);
        diagnostics.dnsResolved = true;

        // Test basic HTTP connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(transport.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { Accept: 'text/event-stream' },
          });
          clearTimeout(timeoutId);

          diagnostics.networkReachable = true;
          diagnostics.responseTime = Date.now() - startTime;

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);

          if (fetchError instanceof Error) {
            if (fetchError.name === 'AbortError') {
              diagnostics.networkReachable = false;
              diagnostics.issue = 'connection_timeout';
              diagnostics.suggestion =
                'Server is not responding within timeout period. Check if the server is running and accessible.';
            } else if (fetchError.message.includes('ENOTFOUND')) {
              diagnostics.networkReachable = false;
              diagnostics.dnsResolved = false;
              diagnostics.issue = 'dns_resolution';
              diagnostics.suggestion =
                'Domain name cannot be resolved. Check the URL and your internet connection.';
            } else if (fetchError.message.includes('ECONNREFUSED')) {
              diagnostics.networkReachable = false;
              diagnostics.issue = 'connection_refused';
              diagnostics.suggestion =
                'Connection refused. Check if the server is running on the specified port.';
            } else if (fetchError.message.includes('certificate')) {
              diagnostics.sslValid = false;
              diagnostics.issue = 'ssl_certificate';
              diagnostics.suggestion =
                'SSL certificate issue. Check if the server has a valid certificate.';
            }
          }

          if (!diagnostics.issue) {
            diagnostics.issue = 'network_error';
            diagnostics.suggestion = `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
          }

          return {
            success: false,
            error: `Pre-flight check failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
            diagnostics,
          };
        }
      } catch (urlError) {
        diagnostics.issue = 'invalid_url';
        diagnostics.suggestion =
          'Invalid URL format. Please check the URL syntax.';
        return {
          success: false,
          error: `Invalid URL: ${transport.url}`,
          diagnostics,
        };
      }
    }

    // Attempt actual MCP connection
    console.log('🔗 Attempting MCP client connection...');

    // Dynamic import to avoid issues with experimental API
    const { experimental_createMCPClient } = await import('ai');

    const connectionPromise = experimental_createMCPClient({ transport });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`MCP connection timeout after ${timeout}ms`)),
        timeout,
      );
    });

    const client = await Promise.race([connectionPromise, timeoutPromise]);
    const connectionTime = Date.now() - startTime;

    console.log(`✅ MCP client connected in ${connectionTime}ms`);

    // Test getting tools
    let tools: any[] = [];
    let serverInfo: any = undefined;

    try {
      const toolsObject = await client.tools();
      tools = Object.entries(toolsObject).map(
        ([name, tool]: [string, any]) => ({
          name,
          description: tool.description || `Tool: ${name}`,
        }),
      );
      console.log(`🛠️ Found ${tools.length} tools`);
    } catch (toolsError) {
      console.warn('⚠️ Failed to get tools:', toolsError);
    }

    // Close the client
    if (typeof client.close === 'function') {
      try {
        await client.close();
      } catch (closeError) {
        console.warn('Warning: Failed to close client:', closeError);
      }
    }

    return {
      success: true,
      connectionTime,
      serverInfo,
      tools,
      diagnostics: {
        ...diagnostics,
        networkReachable: true,
        responseTime: connectionTime,
      },
    };
  } catch (error) {
    const connectionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ MCP connection test failed:', errorMessage);

    // Analyze the error for better diagnostics
    if (errorMessage.includes('timeout')) {
      diagnostics.issue = 'mcp_timeout';
      diagnostics.suggestion =
        'MCP server is not responding. Check if the server supports the MCP protocol and is properly configured.';
    } else if (errorMessage.includes('protocol')) {
      diagnostics.issue = 'protocol_mismatch';
      diagnostics.suggestion =
        'Server may not support the MCP protocol or is using an incompatible version.';
    } else if (errorMessage.includes('auth')) {
      diagnostics.issue = 'authentication';
      diagnostics.suggestion =
        'Authentication failed. Check if the server requires authentication credentials.';
    } else {
      diagnostics.issue = 'mcp_connection_failed';
      diagnostics.suggestion =
        'MCP connection failed. Check server logs and configuration.';
    }

    return {
      success: false,
      error: errorMessage,
      connectionTime,
      diagnostics: {
        ...diagnostics,
        responseTime: connectionTime,
      },
    };
  }
}
