import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import { MCPCleanDashboard } from '@/components/mcp-clean-dashboard';

export default async function MCPPage() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return <MCPCleanDashboard session={session} />;
}