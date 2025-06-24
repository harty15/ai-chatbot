'use client';

import { useState, useEffect } from 'react';
import { Settings, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Server {
  id: string;
  name: string;
  connectionState: {
    status: 'connected' | 'connecting' | 'disconnected' | 'error';
  };
  availableTools?: Array<{
    name: string;
    description?: string;
  }>;
}

interface ToolsDropdownProps {
  className?: string;
}

export function ToolsDropdown({ className }: ToolsDropdownProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [totalTools, setTotalTools] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await fetch('/api/mcp/servers');
        if (response.ok) {
          const data = await response.json();
          const serverList = data.servers || [];
          setServers(serverList);
          
          // Count total tools from connected servers
          const toolCount = serverList.reduce((acc: number, server: Server) => {
            if (server.connectionState?.status === 'connected' && server.availableTools) {
              return acc + server.availableTools.length;
            }
            return acc;
          }, 0);
          
          setTotalTools(toolCount);
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
    const interval = setInterval(fetchServers, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const connectedServers = servers.filter(s => s.connectionState?.status === 'connected');
  const allTools = connectedServers.flatMap(server => 
    (server.availableTools || []).map(tool => ({
      ...tool,
      serverName: server.name,
      serverId: server.id
    }))
  );

  if (loading) {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
        <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (totalTools === 0) {
    return null; // Hide if no tools available
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 px-2 gap-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            className
          )}
        >
          <Settings className="w-4 h-4" />
          <Badge 
            variant="secondary" 
            className="h-5 px-1.5 text-xs font-medium bg-gray-100 text-gray-700 border-0"
          >
            {totalTools}
          </Badge>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Tools</h3>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {totalTools} available
            </Badge>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {connectedServers.length > 0 ? (
            <div className="p-2">
              {/* Server sections */}
              {connectedServers.map((server) => (
                <div key={server.id} className="mb-3 last:mb-0">
                  <div className="flex items-center space-x-2 px-2 py-1.5">
                    <Circle className="w-2 h-2 text-green-500 fill-current" />
                    <span className="text-sm font-medium text-gray-900">{server.name}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {server.availableTools?.length || 0}
                    </Badge>
                  </div>
                  
                  {server.availableTools && server.availableTools.length > 0 && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {server.availableTools.slice(0, 5).map((tool) => (
                        <div 
                          key={`${server.id}-${tool.name}`}
                          className="flex items-center px-2 py-1 rounded text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span className="font-mono text-xs">{tool.name}</span>
                          {tool.description && (
                            <span className="ml-2 text-xs text-gray-500 truncate">
                              {tool.description}
                            </span>
                          )}
                        </div>
                      ))}
                      
                      {server.availableTools.length > 5 && (
                        <div className="px-2 py-1 text-xs text-gray-500">
                          +{server.availableTools.length - 5} more tools
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No tools available</p>
              <p className="text-xs text-gray-500 mt-1">
                Connect MCP servers to enable tools
              </p>
            </div>
          )}
        </div>

        {/* Footer with manage link */}
        <div className="p-3 border-t bg-gray-50">
          <Link href="/mcp">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between h-8 text-xs text-gray-600 hover:text-gray-900"
            >
              <span>Manage servers</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}