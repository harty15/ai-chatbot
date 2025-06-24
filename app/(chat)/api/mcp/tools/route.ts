import { auth } from '@/app/(auth)/auth';
import { getMcpToolsByUserId, updateMcpToolEnabled } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tools = await getMcpToolsByUserId({ userId: session.user.id });
    
    return NextResponse.json({ 
      tools: tools.map(tool => ({
        id: tool.id,
        serverId: tool.serverId,
        name: tool.name,
        description: tool.description,
        isEnabled: tool.isEnabled,
        lastUsed: tool.lastUsed,
        usageCount: tool.usageCount,
        averageExecutionTime: tool.averageExecutionTime,
      }))
    });
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toolId, isEnabled } = body;

    if (!toolId || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. toolId and isEnabled are required.' },
        { status: 400 }
      );
    }

    await updateMcpToolEnabled({
      toolId,
      isEnabled,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tool preference:', error);
    return NextResponse.json(
      { error: 'Failed to update tool preference' },
      { status: 500 }
    );
  }
}