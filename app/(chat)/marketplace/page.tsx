import { auth } from '@/app/(auth)/auth';
import {
  getPublicMCPServers,
  getCuratedMCPServers,
} from '@/lib/db/queries/mcp';
import { redirect } from 'next/navigation';
import { MarketplacePage } from '@/components/marketplace-page';

export default async function Marketplace() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const [publicServers, curatedServers] = await Promise.all([
    getPublicMCPServers(),
    getCuratedMCPServers(),
  ]);

  return (
    <MarketplacePage
      publicServers={publicServers}
      curatedServers={curatedServers}
      userId={session.user.id}
    />
  );
}
