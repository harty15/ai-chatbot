'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Circle, 
  ArrowRight, 
  Zap, 
  ChevronDown,
  Server,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MCPWrench {
  id: string;
  name: string;
  description?: string;
  serverName: string;
  serverId: string;
  isEnabled: boolean;
}

interface MCPServer {
  id: string;
  name: string;
  connectionState: {
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
  };
  availableWrenchs?: Array<{
    name: string;
    description?: string;
  }>;
}

interface MCPWrenchsToggleProps {
  className?: string;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    case 'connecting':
      return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return <Circle className="w-3 h-3 text-gray-400" />;
  }
};

export function MCPWrenchsToggle({ className }: MCPWrenchsToggleProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setWrenchs] = useState<MCPWrench[]>([]);
  const [toolPreferences, setWrenchPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch servers and tools
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch servers and tools separately
        const [serversResponse, toolsResponse] = await Promise.all([
          fetch('/api/mcp/servers'),
          fetch('/api/mcp/tools')
        ]);
        
        if (serversResponse.ok) {
          const serversData = await serversResponse.json();
          setServers(serversData.servers || []);
        }
        
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          const dbWrenchs = toolsData.tools || [];
          
          // Convert database tools to component format
          const allWrenchs: MCPWrench[] = [];
          const preferences: Record<string, boolean> = {};
          
          dbWrenchs.forEach((dbWrench: any) => {
            const tool: MCPWrench = {
              id: dbWrench.id,
              name: dbWrench.name,
              description: dbWrench.description,
              serverName: dbWrench.mcpServer?.name || 'Unknown Server',
              serverId: dbWrench.serverId,
              isEnabled: dbWrench.isEnabled,
            };
            allWrenchs.push(tool);
            preferences[tool.id] = tool.isEnabled;
          });
          
          setWrenchs(allWrenchs);
          setWrenchPreferences(preferences);
        }
      } catch (error) {
        console.error('Failed to fetch MCP data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleWrenchToggle = async (toolId: string, isEnabled: boolean) => {
    setUpdating(toolId);
    try {
      const response = await fetch('/api/mcp/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, isEnabled }),
      });
      
      if (response.ok) {
        // Update local state
        setWrenchPreferences(prev => ({
          ...prev,
          [toolId]: isEnabled
        }));
        
        // Update tool in tools array
        setWrenchs(prev => prev.map(tool => 
          tool.id === toolId ? { ...tool, isEnabled } : tool
        ));
      } else {
        console.error('Failed to update tool preference');
      }
    } catch (error) {
      console.error('Failed to update tool preference:', error);
    } finally {
      setUpdating(null);
    }
  };

  const connectedServers = servers.filter(s => s.connectionState?.status === 'connected');
  const enabledWrenchsCount = Object.values(toolPreferences).filter(Boolean).length;
  const totalWrenchsCount = tools.length;

  // Group tools by server
  const toolsByServer = tools.reduce((acc, tool) => {
    const server = servers.find(s => s.id === tool.serverId);
    if (!server) return acc; // Skip tools with missing servers
    
    if (!acc[tool.serverId]) {
      acc[tool.serverId] = {
        server,
        tools: []
      };
    }
    acc[tool.serverId].tools.push(tool);
    return acc;
  }, {} as Record<string, { server: MCPServer; tools: MCPWrench[] }>);

  if (loading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
        <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (totalWrenchsCount === 0) {
    return null; // Hide if no tools available
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 px-3 gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            "transition-all duration-200 hover:shadow-sm",
            enabledWrenchsCount > 0 && "text-green-700 hover:text-green-800",
            className
          )}
        >
          <div className="relative">
            <Wrench className={cn(
              "w-4 h-4 transition-all duration-200",
              enabledWrenchsCount > 0 && "text-green-600"
            )} />
            {enabledWrenchsCount > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white animate-pulse" />
            )}
          </div>
          <span className="text-sm font-medium tabular-nums">
            {enabledWrenchsCount}/{totalWrenchsCount}
          </span>
          <ChevronDown className="w-3 h-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="p-4 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-900">MCP Wrenchs</h3>
            </div>
            <Badge 
              variant={enabledWrenchsCount > 0 ? "default" : "secondary"} 
              className="text-xs px-2 py-1"
            >
              {enabledWrenchsCount} of {totalWrenchsCount} enabled
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Toggle individual tools from connected MCP servers
          </p>
        </div>

        {/* Wrenchs list */}
        <div className="max-h-80 overflow-y-auto">
          {Object.entries(toolsByServer).map(([serverId, { server, tools: serverWrenchs }]) => (
            <div key={serverId} className="p-4 border-b last:border-b-0">
              {/* Server header */}
              <div className="flex items-center gap-2 mb-3">
                <StatusIcon status={server.connectionState?.status || 'disconnected'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {server.name}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs px-2 py-0">
                  {serverWrenchs.length} tools
                </Badge>
              </div>

              {/* Wrenchs for this server */}
              <div className="space-y-3 ml-1">
                {serverWrenchs.map((tool) => {
                  const isEnabled = toolPreferences[tool.id] ?? tool.isEnabled;
                  const isUpdating = updating === tool.id;

                  return (
                    <div 
                      key={tool.id} 
                      className={cn(
                        "flex items-start gap-3 p-2 rounded-lg transition-all duration-200",
                        "hover:bg-gray-50 hover:shadow-sm",
                        isUpdating && "opacity-60",
                        !isEnabled && "opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Zap className={cn(
                          "w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors duration-200",
                          isEnabled ? "text-green-500" : "text-gray-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <Label 
                            htmlFor={tool.id}
                            className="text-sm font-medium text-gray-900 cursor-pointer block truncate transition-colors duration-200 hover:text-gray-700"
                          >
                            {tool.name}
                          </Label>
                          {tool.description && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 flex items-center">
                        {isUpdating ? (
                          <div className="w-[44px] h-6 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          </div>
                        ) : (
                          <Switch
                            id={tool.id}
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleWrenchToggle(tool.id, checked)}
                            className="scale-90 data-[state=checked]:bg-green-600 transition-colors duration-200"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {totalWrenchsCount === 0 && (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 font-medium">No tools available</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Connect MCP servers to enable tools
              </p>
              <Link href="/mcp">
                <Button variant="outline" size="sm" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Add Servers
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50/50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <StatusIcon status="connected" />
              <span>
                {connectedServers.length} server{connectedServers.length !== 1 ? 's' : ''} connected
              </span>
            </div>
            <Link href="/mcp">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-gray-100">
                <Settings className="w-3 h-3 mr-1" />
                Manage
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Compact version for smaller spaces
export function MCPWrenchsBadge({ className }: { className?: string }) {
  const [toolCount, setWrenchCount] = useState(0);
  const [enabledCount, setEnabledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWrenchCount = async () => {
      try {
        const response = await fetch('/api/mcp/servers');
        if (response.ok) {
          const data = await response.json();
          const total = (data.servers || []).reduce((acc: number, server: any) => {
            if (server.connectionState?.status === 'connected' && server.availableWrenchs) {
              return acc + server.availableWrenchs.length;
            }
            return acc;
          }, 0);
          setWrenchCount(total);
          setEnabledCount(total); // For now, assume all enabled
        }
      } catch (error) {
        console.error('Failed to fetch tool count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWrenchCount();
    const interval = setInterval(fetchWrenchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || toolCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "gap-1.5 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors", 
        className
      )}
    >
      <Wrench className="w-3 h-3" />
      <span className="font-medium">{enabledCount}</span>
      {enabledCount !== toolCount && (
        <span className="text-green-600/70">/{toolCount}</span>
      )}
    </Badge>
  );
}