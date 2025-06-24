'use client';

import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Circle, CheckCircle2, AlertCircle, Terminal, Globe } from 'lucide-react';
import type { Session } from 'next-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MCPCleanServerForm } from '@/components/mcp-clean-form';
import { cn } from '@/lib/utils';
import type { MCPServerWithTools, MCPDashboardStats } from '@/lib/ai/mcp-types';

interface CleanDashboardProps {
  session: Session;
}

export function MCPCleanDashboard({ session }: CleanDashboardProps) {
  const [servers, setServers] = useState<MCPServerWithTools[]>([]);
  const [stats, setStats] = useState<MCPDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isServerDialogOpen, setIsServerDialogOpen] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [serversResponse, dashboardResponse] = await Promise.all([
        fetch('/api/mcp/servers'),
        fetch('/api/mcp/dashboard'),
      ]);

      if (serversResponse.ok && dashboardResponse.ok) {
        const serversData = await serversResponse.json();
        const dashboardData = await dashboardResponse.json();
        setServers(serversData.servers || []);
        setStats(dashboardData.stats);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleServerCreated = (newServer: any) => {
    setServers(prev => [newServer, ...prev]);
    setIsServerDialogOpen(false);
    loadDashboardData();
  };

  if (loading && servers.length === 0) {
    return <CleanDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">MCP Servers</h1>
            <p className="text-sm text-gray-600">
              Manage your Model Context Protocol connections
            </p>
          </div>
          
          <Dialog open={isServerDialogOpen} onOpenChange={setIsServerDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-gray-900 hover:bg-gray-800">
                <Plus className="w-4 h-4" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add MCP Server</DialogTitle>
              </DialogHeader>
              <MCPCleanServerForm
                onSuccess={handleServerCreated}
                onCancel={() => setIsServerDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        {stats && <CleanStatsGrid stats={stats} />}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Servers List */}
          <div className="lg:col-span-2 space-y-1">
            {servers.length === 0 ? (
              <EmptyServersState onAddServer={() => setIsServerDialogOpen(true)} />
            ) : (
              servers.map((server) => (
                <CleanServerCard 
                  key={server.id} 
                  server={server}
                  onUpdate={loadDashboardData}
                />
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CleanActivityPanel />
            <CleanQuickActions onRefresh={loadDashboardData} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Clean server card component
function CleanServerCard({ server, onUpdate }: { server: any; onUpdate: () => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const status = server.connectionState?.status || 'disconnected';
  const isConnected = status === 'connected';
  const tools = server.availableTools || [];

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await fetch(`/api/mcp/servers/${server.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      onUpdate();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card className="group hover:shadow-sm transition-all duration-200 border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {/* Status indicator */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 mt-0.5">
              {status === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : status === 'connecting' ? (
                <Circle className="w-4 h-4 text-blue-600 animate-pulse" />
              ) : status === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 truncate">{server.name}</h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs border-0 px-2 py-0.5",
                    isConnected 
                      ? "bg-green-50 text-green-700"
                      : status === 'error'
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {status}
                </Badge>
              </div>
              
              {server.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {server.description}
                </p>
              )}

              {/* Transport info */}
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                  {server.transportType === 'stdio' ? (
                    <Terminal className="w-3.5 h-3.5" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">{server.transportType?.toUpperCase()}</span>
                </div>
                
                {tools.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">{tools.length}</span> tools
                  </div>
                )}
              </div>

              {/* Tools preview */}
              {tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {tools.slice(0, 3).map((tool: any) => (
                    <span 
                      key={tool.name}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-700"
                    >
                      {tool.name}
                    </span>
                  ))}
                  {tools.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500">
                      +{tools.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => handleAction(isConnected ? 'disconnect' : 'connect')}>
                {actionLoading ? 'Working...' : isConnected ? 'Disconnect' : 'Connect'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('reconnect')}>
                Reconnect
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Clean stats grid
function CleanStatsGrid({ stats }: { stats: MCPDashboardStats }) {
  const statItems = [
    { label: 'Total Servers', value: stats.totalServers, color: 'blue' },
    { label: 'Connected', value: stats.connectedServers, color: 'green' },
    { label: 'Available Tools', value: stats.totalTools, color: 'purple' },
    { label: 'Total Executions', value: stats.totalExecutions, color: 'orange' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {item.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Empty state
function EmptyServersState({ onAddServer }: { onAddServer: () => void }) {
  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
          <Terminal className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No servers configured</h3>
        <p className="text-sm text-gray-600 text-center mb-6 max-w-sm">
          Get started by adding your first MCP server to enable powerful tools and integrations.
        </p>
        <Button onClick={onAddServer} size="sm" className="bg-gray-900 hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Add Your First Server
        </Button>
      </CardContent>
    </Card>
  );
}

// Activity panel
function CleanActivityPanel() {
  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-3">
          <div className="text-sm text-gray-600 text-center py-8">
            No recent activity
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick actions
function CleanQuickActions({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-sm h-8"
            onClick={onRefresh}
          >
            Refresh All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton
function CleanDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-gray-200">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                      <div className="flex space-x-2">
                        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}