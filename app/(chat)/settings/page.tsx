import { auth } from '@/app/(auth)/auth';
import { getUserMCPConfigs } from '@/lib/db/queries/mcp';
import { redirect } from 'next/navigation';
import { SettingsPage } from '@/components/settings-page';

export default async function Settings() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const mcpConfigs = await getUserMCPConfigs(session.user.id);

  return <SettingsPage mcpConfigs={mcpConfigs} userId={session.user.id} />;
}
