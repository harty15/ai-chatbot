import { auth } from '@/app/(auth)/auth';
import { getMCPServerById } from '@/lib/db/queries/mcp';
import { MCPClientManager } from '@/lib/ai/mcp/client-manager';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serverId } = await params;
    const { credentials } = await request.json();

    if (!credentials) {
      return NextResponse.json(
        { error: 'Credentials are required' },
        { status: 400 },
      );
    }

    // Get the MCP server configuration
    const server = await getMCPServerById(serverId);
    if (!server) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 },
      );
    }

    // Create a test configuration with the provided credentials
    const testConfig = {
      id: 'test',
      userId: session.user.id,
      mcpServerId: server.id,
      enabled: true,
      server: {
        id: server.id,
        name: server.name,
        description: server.description || undefined,
        iconUrl: server.iconUrl || undefined,
        transportType: server.transportType as 'sse' | 'stdio_proxy',
        transportConfig: {
          type: server.transportType,
          ...(server.transportConfig as object),
          ...(credentials as object), // Merge in the provided credentials
        } as any,
        schemaConfig: server.schemaConfig,
        isPublic: server.isPublic,
        isCurated: server.isCurated,
        createdByUserId: server.createdByUserId || undefined,
      },
      toolConfigs: [],
      credentials: credentials,
    };

    // Import the global client manager instance
    const { mcpClientManager } = await import('@/lib/ai/mcp/client-manager');

    // Test the connection with provided credentials
    const testResult = await mcpClientManager.testConnection(
      testConfig,
      session.user.id,
    );

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        toolsAvailable: testResult.toolCount || 0,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: testResult.error || 'Connection failed',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error testing MCP connection:', error);
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 },
    );
  }
}
