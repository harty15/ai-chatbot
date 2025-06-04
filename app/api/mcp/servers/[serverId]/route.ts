import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  updateUserMCPConfig,
  deleteUserMCPConfig,
  getUserMCPConfig,
} from '@/lib/db/queries/mcp';

export async function PUT(
  request: Request,
  { params }: { params: { serverId: string } },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled status is required' },
        { status: 400 },
      );
    }

    const updatedConfig = await updateUserMCPConfig(
      session.user.id,
      params.serverId,
      { enabled },
    );

    if (!updatedConfig) {
      return NextResponse.json(
        { error: 'Failed to update MCP server status' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating MCP server status:', error);
    return NextResponse.json(
      { error: 'Failed to update MCP server status' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { serverId: string } },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user has this MCP configured
    const userConfig = await getUserMCPConfig(session.user.id, params.serverId);

    if (!userConfig) {
      return NextResponse.json(
        { error: 'MCP server not found' },
        { status: 404 },
      );
    }

    const success = await deleteUserMCPConfig(session.user.id, params.serverId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove MCP server' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to remove MCP server' },
      { status: 500 },
    );
  }
}
