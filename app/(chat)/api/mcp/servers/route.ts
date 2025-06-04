import { auth } from '@/app/(auth)/auth';
import { getUserMCPConfigs, createUserMCPConfig } from '@/lib/db/queries/mcp';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await getUserMCPConfigs(session.user.id);
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching MCP configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP configurations' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mcpServerId, enabled = false } = await request.json();

    if (!mcpServerId) {
      return NextResponse.json(
        { error: 'MCP server ID is required' },
        { status: 400 },
      );
    }

    const config = await createUserMCPConfig({
      userId: session.user.id,
      mcpServerId,
      enabled,
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error creating MCP config:', error);
    return NextResponse.json(
      { error: 'Failed to create MCP configuration' },
      { status: 500 },
    );
  }
}
