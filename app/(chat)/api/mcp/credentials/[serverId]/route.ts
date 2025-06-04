import { auth } from '@/app/(auth)/auth';
import { updateUserMCPCredentials } from '@/lib/db/queries/mcp';
import { encryptCredentials } from '@/lib/ai/mcp/encryption';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function PUT(
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

    // Encrypt credentials using user-specific encryption
    const encryptedCredentials = await encryptCredentials(
      credentials,
      session.user.id,
    );

    // Update credentials in database
    const result = await updateUserMCPCredentials(
      session.user.id,
      serverId,
      encryptedCredentials,
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update credentials' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating MCP credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update credentials' },
      { status: 500 },
    );
  }
}
