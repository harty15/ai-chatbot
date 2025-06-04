'use client';

import { useState } from 'react';
import { Store, Plus, Search, Star, Users, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { MCPServer } from '@/lib/db/schema';
import { toast } from 'sonner';

interface MarketplacePageProps {
  publicServers: MCPServer[];
  curatedServers: MCPServer[];
  userId: string;
}

export function MarketplacePage({
  publicServers,
  curatedServers,
  userId,
}: MarketplacePageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'curated' | 'community'>(
    'curated',
  );

  const handleAddMCP = async (mcpServerId: string, serverName: string) => {
    setIsLoading((prev) => ({ ...prev, [mcpServerId]: true }));

    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpServerId }),
      });

      if (response.ok) {
        toast.success(`${serverName} added to your MCPs`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add MCP server');
      }
    } catch (error) {
      toast.error('Failed to add MCP server');
    } finally {
      setIsLoading((prev) => ({ ...prev, [mcpServerId]: false }));
    }
  };

  const filterServers = (servers: MCPServer[]) => {
    if (!searchTerm) return servers;

    return servers.filter(
      (server) =>
        server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const MCPServerCard = ({ server }: { server: MCPServer }) => (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {server.iconUrl ? (
              <img
                src={server.iconUrl}
                alt={server.name}
                className="w-10 h-10 rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{server.name}</CardTitle>
              <div className="flex gap-2 mt-1">
                {server.isCurated && (
                  <Badge variant="default" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Curated
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {server.transportType.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <Button
            onClick={() => handleAddMCP(server.id, server.name)}
            disabled={isLoading[server.id]}
            size="sm"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {server.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {server.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>Public</span>
          </div>
          {server.createdByUserId && <span>Community</span>}
        </div>
      </CardContent>
    </Card>
  );

  const currentServers =
    activeTab === 'curated' ? curatedServers : publicServers;
  const filteredServers = filterServers(currentServers);

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">MCP Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Discover and add MCP servers to extend your chat capabilities
            </p>
          </div>
        </div>

        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Upload Custom MCP
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search MCP servers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'curated' ? 'default' : 'outline'}
          onClick={() => setActiveTab('curated')}
          className="flex items-center gap-2"
        >
          <Star className="h-4 w-4" />
          Curated ({curatedServers.length})
        </Button>
        <Button
          variant={activeTab === 'community' ? 'default' : 'outline'}
          onClick={() => setActiveTab('community')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Community ({publicServers.length})
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            {activeTab === 'curated'
              ? 'Curated MCP Servers'
              : 'Community MCP Servers'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'curated'
              ? 'Hand-picked, high-quality MCP servers maintained by our team.'
              : 'MCP servers created and shared by the community.'}
          </p>
        </div>

        {filteredServers.length === 0 ? (
          <div className="text-center py-12">
            {activeTab === 'curated' ? (
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            ) : (
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold mb-2">
              No {activeTab} servers found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : activeTab === 'curated'
                  ? 'Check back later for new additions.'
                  : 'Be the first to share an MCP server!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServers.map((server) => (
              <MCPServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
