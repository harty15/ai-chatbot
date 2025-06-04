import { auth } from '@/app/(auth)/auth';
import {
  updateUserMCPConfig,
  deleteUserMCPConfig,
  getUserMCPConfig,
} from '@/lib/db/queries/mcp';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: mcpServerId } = await params;
    const { enabled, encryptedCredentials } = await request.json();

    const config = await updateUserMCPConfig(session.user.id, mcpServerId, {
      enabled,
      encryptedCredentials,
    });

    if (!config) {
      return NextResponse.json(
        { error: 'MCP configuration not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating MCP config:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP configuration' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: mcpServerId } = await params;

    const success = await deleteUserMCPConfig(session.user.id, mcpServerId);

    if (!success) {
      return NextResponse.json(
        { error: 'MCP configuration not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP config:', error);
    return NextResponse.json(
      { error: 'Failed to delete MCP configuration' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: mcpServerId } = await params;

    const config = await getUserMCPConfig(session.user.id, mcpServerId);

    if (!config) {
      return NextResponse.json(
        { error: 'MCP configuration not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching MCP config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP configuration' },
      { status: 500 },
    );
  }
}
