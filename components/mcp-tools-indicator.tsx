'use client';

import { useState, useEffect } from 'react';
import { Server, Zap, ChevronDown, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

interface MCPToolsIndicatorProps {
  className?: string;
}

interface MCPServerInfo {
  id: string;
  name: string;
  isEnabled: boolean;
  connectionStatus: string;
  toolCount: number;
  tools: Array<{
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
  }>;
}

export function MCPToolsIndicator({ className }: MCPToolsIndicatorProps) {
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load MCP servers and tools
  const loadMCPData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/mcp/servers');
      if (!response.ok) {
        throw new Error('Failed to load MCP servers');
      }

      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP data');
      console.error('Error loading MCP data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMCPData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(loadMCPData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate totals
  const connectedServers = servers.filter(s => s.connectionStatus === 'connected').length;
  const totalTools = servers.reduce((sum, server) => sum + server.toolCount, 0);
  const enabledTools = servers.reduce((sum, server) => 
    sum + server.tools.filter(tool => tool.isEnabled).length, 0
  );

  // Don't show indicator if no servers are configured
  if (!loading && servers.length === 0) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <div className="w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span>Loading tools...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs text-red-600 ${className}`}>
            <AlertCircle className="w-3 h-3" />
            <span>MCP Error</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{error}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === 'connected') {
      return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    }
    return <AlertCircle className="w-3 h-3 text-gray-400" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-6 px-2 text-xs gap-1 hover:bg-gray-100 ${className}`}
        >
          <Server className="w-3 h-3" />
          <span className="hidden sm:inline">
            {connectedServers > 0 ? `${enabledTools} tools` : 'No tools'}
          </span>
          {connectedServers > 0 && (
            <Badge variant="secondary" className="text-xs h-4 px-1">
              {connectedServers}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="w-4 h-4" />
              MCP Tools
            </CardTitle>
            <Link href="/mcp">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                <ExternalLink className="w-3 h-3" />
                Manage
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-0 max-h-96 overflow-y-auto">
          {servers.length === 0 ? (
            <div className="text-center py-4">
              <Server className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">No MCP servers configured</p>
              <Link href="/mcp">
                <Button size="sm" variant="outline">
                  Add Server
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium text-gray-900">{servers.length}</div>
                  <div className="text-gray-500">Servers</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-medium text-green-900">{connectedServers}</div>
                  <div className="text-green-600">Connected</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-900">{enabledTools}</div>
                  <div className="text-blue-600">Tools</div>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Servers List */}
              <div className="space-y-2">
                {servers.map((server) => (
                  <div 
                    key={server.id}
                    className="flex items-center justify-between p-2 rounded border bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(server.connectionStatus)}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{server.name}</div>
                        <div className="text-xs text-gray-500">
                          {server.toolCount} tools available
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {server.connectionStatus === 'connected' && server.toolCount > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Zap className="w-3 h-3" />
                          {server.tools.filter(t => t.isEnabled).length}
                        </Badge>
                      )}
                      
                      <Badge 
                        variant={server.connectionStatus === 'connected' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {server.connectionStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Available Tools */}
              {enabledTools > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-2">Available Tools:</div>
                    <div className="flex flex-wrap gap-1">
                      {servers
                        .filter(server => server.connectionStatus === 'connected')
                        .flatMap(server => server.tools.filter(tool => tool.isEnabled))
                        .slice(0, 8)
                        .map((tool) => (
                          <Badge key={`${tool.id}`} variant="outline" className="text-xs">
                            {tool.name}
                          </Badge>
                        ))}
                      {enabledTools > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{enabledTools - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Help Text */}
              {connectedServers === 0 && servers.length > 0 && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  No servers connected. Visit the MCP page to connect your servers.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}