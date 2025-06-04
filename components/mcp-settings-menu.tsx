'use client';

import { useState, useEffect } from 'react';
import { Settings, Power, ChevronDown, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserMCPConfiguration } from '@/lib/ai/mcp/types';
import { toast } from 'sonner';

interface MCPSettingsMenuProps {
  userId: string;
  disabled?: boolean;
}

export function MCPSettingsMenu({
  userId,
  disabled = false,
}: MCPSettingsMenuProps) {
  const [mcpConfigs, setMcpConfigs] = useState<UserMCPConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);

  // Fetch MCP configurations
  useEffect(() => {
    const fetchMCPConfigs = async () => {
      try {
        const response = await fetch('/api/mcp/servers');
        if (response.ok) {
          const configs = await response.json();
          setMcpConfigs(configs);
        }
      } catch (error) {
        console.error('Failed to fetch MCP configurations:', error);
      }
    };

    if (userId) {
      fetchMCPConfigs();
    }
  }, [userId]);

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

        const serverName =
          mcpConfigs.find((c) => c.mcpServerId === mcpServerId)?.server.name ||
          'MCP';
        toast.success(`${serverName} ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to update MCP configuration');
      }
    } catch (error) {
      toast.error('Failed to update MCP configuration');
    } finally {
      setIsLoading((prev) => ({ ...prev, [mcpServerId]: false }));
    }
  };

  const enabledMCPs = mcpConfigs.filter((config) => config.enabled);
  const totalActiveTools = enabledMCPs.reduce(
    (sum, config) => sum + config.toolConfigs.filter((tc) => tc.enabled).length,
    0,
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          className="rounded-md p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 relative"
          disabled={disabled}
          variant="ghost"
          size="sm"
        >
          <Settings size={14} />

          {/* Active MCP indicator */}
          {enabledMCPs.length > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center min-w-[16px]"
            >
              {totalActiveTools}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        className="w-80 max-h-[400px] overflow-y-auto"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">MCP Tools</span>
          {enabledMCPs.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {totalActiveTools} active
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {mcpConfigs.length === 0 ? (
          <DropdownMenuItem disabled className="flex flex-col items-start py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle size={16} />
              <span>No MCP servers configured</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              Visit the MCP page to add servers
            </span>
          </DropdownMenuItem>
        ) : (
          <>
            {mcpConfigs.map((config) => {
              const activeToolsCount = config.toolConfigs.filter(
                (tc) => tc.enabled,
              ).length;
              const totalToolsCount = config.toolConfigs.length;

              return (
                <DropdownMenuItem
                  key={config.id}
                  className="flex items-center justify-between p-3 cursor-default focus:bg-muted"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {config.server.iconUrl ? (
                      <img
                        src={config.server.iconUrl}
                        alt={config.server.name}
                        className="w-6 h-6 rounded"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                        <Settings className="h-3 w-3" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {config.server.name}
                        </span>
                        {config.enabled && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Power className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activeToolsCount}/{totalToolsCount} tools
                        </Badge>
                        {config.server.isCurated && (
                          <Badge variant="secondary" className="text-xs">
                            Curated
                          </Badge>
                        )}
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
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />

            <DropdownMenuItem className="p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/mcps';
                }}
              >
                <Settings className="h-3 w-3 mr-1" />
                Manage MCPs
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
