import { auth } from '@/app/(auth)/auth';
import { getUserMCPConfigs } from '@/lib/db/queries/mcp';
import { redirect } from 'next/navigation';
import { MCPPage } from '@/components/mcp-page';

export default async function MCPs() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const mcpConfigs = await getUserMCPConfigs(session.user.id);

  return <MCPPage mcpConfigs={mcpConfigs} userId={session.user.id} />;
}
