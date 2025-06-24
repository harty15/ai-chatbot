'use client';

import { useState, useEffect } from 'react';
import { Zap, ChevronDown, Circle, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ToolsIndicatorProps {
  className?: string;
}

export function MCPCleanToolsIndicator({ className }: ToolsIndicatorProps) {
  const [tools, setTools] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/mcp/servers');
        if (response.ok) {
          const data = await response.json();
          setServers(data.servers || []);
          
          // Extract all tools from connected servers
          const allTools = (data.servers || []).reduce((acc: any[], server: any) => {
            if (server.connectionState?.status === 'connected' && server.availableTools) {
              return [...acc, ...server.availableTools.map((tool: any) => ({
                ...tool,
                serverName: server.name,
                serverId: server.id
              }))];
            }
            return acc;
          }, []);
          
          setTools(allTools);
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

  const connectedServers = servers.filter(s => s.connectionState?.status === 'connected');
  const hasTools = tools.length > 0;

  if (loading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!hasTools && connectedServers.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 px-3 gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            className
          )}
        >
          <div className="relative">
            <Zap className="w-4 h-4" />
            {hasTools && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </div>
          <span className="text-sm font-medium">
            {hasTools ? `${tools.length} tools` : `${connectedServers.length} servers`}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">MCP Tools</h3>
          <p className="text-sm text-gray-600 mt-1">
            Available tools from connected servers
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {hasTools ? (
            <div className="p-2">
              {/* Group tools by server */}
              {Object.entries(
                tools.reduce((acc, tool) => {
                  const serverName = tool.serverName;
                  if (!acc[serverName]) acc[serverName] = [];
                  acc[serverName].push(tool);
                  return acc;
                }, {} as Record<string, any[]>)
              ).map(([serverName, serverTools]) => (
                <div key={serverName} className="mb-4 last:mb-0">
                  <div className="flex items-center space-x-2 px-2 py-1">
                    <Circle className="w-3 h-3 text-green-500 fill-current" />
                    <span className="text-xs font-medium text-gray-900">{serverName}</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {serverTools.length}
                    </Badge>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {serverTools.map((tool) => (
                      <div 
                        key={`${tool.serverId}-${tool.name}`}
                        className="flex items-start space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                      >
                        <Zap className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900">{tool.name}</div>
                          {tool.description && (
                            <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {tool.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <Zap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No tools available</p>
              <p className="text-xs text-gray-500 mt-1">
                Connect MCP servers to enable tools
              </p>
            </div>
          )}
        </div>

        {connectedServers.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {connectedServers.length} server{connectedServers.length !== 1 ? 's' : ''} connected
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Manage
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Compact version for smaller spaces
export function MCPToolsBadge({ className }: { className?: string }) {
  const [toolCount, setToolCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToolCount = async () => {
      try {
        const response = await fetch('/api/mcp/servers');
        if (response.ok) {
          const data = await response.json();
          const count = (data.servers || []).reduce((acc: number, server: any) => {
            if (server.connectionState?.status === 'connected' && server.availableTools) {
              return acc + server.availableTools.length;
            }
            return acc;
          }, 0);
          setToolCount(count);
        }
      } catch (error) {
        console.error('Failed to fetch tool count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchToolCount();
    const interval = setInterval(fetchToolCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || toolCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn("gap-1 text-xs bg-green-50 text-green-700 border-green-200", className)}
    >
      <Zap className="w-3 h-3" />
      {toolCount}
    </Badge>
  );
}