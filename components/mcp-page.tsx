'use client';

import { useState } from 'react';
import { Settings, Plus, Power, Wrench, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { UserMCPConfiguration } from '@/lib/ai/mcp/types';
import { toast } from 'sonner';
import Link from 'next/link';

interface MCPPageProps {
  mcpConfigs: UserMCPConfiguration[];
  userId: string;
}

export function MCPPage({ mcpConfigs: initialConfigs, userId }: MCPPageProps) {
  const [mcpConfigs, setMcpConfigs] =
    useState<UserMCPConfiguration[]>(initialConfigs);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const handleToggleMCP = async (mcpServerId: string, enabled: boolean) => {
    setIsLoading((prev) => ({ ...prev, [mcpServerId]: true }));

    try {
      const response = await fetch(`/api/mcp/servers/${mcpServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setMcpConfigs((prev) =>
          prev.map((config) =>
            config.mcpServerId === mcpServerId
              ? { ...config, enabled }
              : config,
          ),
        );
        toast.success(`MCP ${enabled ? 'enabled' : 'disabled'} successfully`);
      } else {
        toast.error('Failed to update MCP configuration');
      }
    } catch (error) {
      toast.error('Failed to update MCP configuration');
    } finally {
      setIsLoading((prev) => ({ ...prev, [mcpServerId]: false }));
    }
  };

  const getEnabledToolsCount = (config: UserMCPConfiguration) => {
    return config.toolConfigs.filter((tc) => tc.enabled).length;
  };

  const getTotalToolsCount = (config: UserMCPConfiguration) => {
    return config.toolConfigs.length;
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">MCP Servers</h1>
            <p className="text-sm text-muted-foreground">
              {mcpConfigs.length} configured •{' '}
              {mcpConfigs.filter((c) => c.enabled).length} enabled
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/marketplace">
              <Plus className="h-4 w-4 mr-2" />
              Browse Marketplace
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href="/settings">
              <Wrench className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* MCP Cards */}
      {mcpConfigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No MCP Servers Configured
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Get started by browsing the marketplace to add MCP servers that
            extend your chat capabilities.
          </p>
          <Button asChild>
            <Link href="/marketplace">
              <Plus className="h-4 w-4 mr-2" />
              Browse Marketplace
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mcpConfigs.map((config) => (
            <Card
              key={config.id}
              className={`group hover:shadow-md transition-shadow ${
                config.enabled
                  ? 'ring-2 ring-green-200 dark:ring-green-800'
                  : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {config.server.iconUrl ? (
                      <img
                        src={config.server.iconUrl}
                        alt={config.server.name}
                        className="w-8 h-8 rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <Settings className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {config.server.name}
                      </CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge
                          variant={config.enabled ? 'default' : 'secondary'}
                        >
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {config.server.isCurated && (
                          <Badge variant="outline">Curated</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {config.server.transportType.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) =>
                      handleToggleMCP(config.mcpServerId, enabled)
                    }
                    disabled={isLoading[config.mcpServerId]}
                  />
                </div>
              </CardHeader>

              <CardContent>
                {config.server.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {config.server.description}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tools Available
                    </span>
                    <span className="font-medium">
                      {getEnabledToolsCount(config)} /{' '}
                      {getTotalToolsCount(config)}
                    </span>
                  </div>

                  {config.enabled && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Power className="h-3 w-3" />
                      <span>Connected</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/mcps/${config.mcpServerId}/configure`}>
                        <Wrench className="h-3 w-3 mr-1" />
                        Configure
                      </Link>
                    </Button>

                    {config.server.transportType === 'sse' &&
                      config.server.transportConfig.url && (
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={config.server.transportConfig.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
