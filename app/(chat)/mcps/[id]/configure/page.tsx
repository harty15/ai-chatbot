import { auth } from '@/app/(auth)/auth';
import { getUserMCPConfig, getMCPServerById } from '@/lib/db/queries/mcp';
import { redirect } from 'next/navigation';
import { MCPConfigurePage } from '@/components/mcp-configure-page';

interface MCPConfigurePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MCPConfigure({ params }: MCPConfigurePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const { id } = await params;

  // Get the user's MCP configuration for this server
  const userConfig = await getUserMCPConfig(session.user.id, id);

  if (!userConfig) {
    // If user doesn't have this MCP configured, redirect to MCPs page
    redirect('/mcps');
  }

  // Get the MCP server details
  const mcpServer = await getMCPServerById(id);

  if (!mcpServer) {
    redirect('/mcps');
  }

  return (
    <MCPConfigurePage
      mcpServerId={id}
      userConfig={userConfig}
      mcpServer={mcpServer}
      userId={session.user.id}
    />
  );
}
