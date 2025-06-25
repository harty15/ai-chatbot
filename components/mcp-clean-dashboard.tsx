'use client';

import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Circle, CheckCircle2, AlertCircle, Terminal, Globe, RefreshCw, Search, Filter } from 'lucide-react';
import type { Session } from 'next-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MCPCleanServerForm } from '@/components/mcp-clean-form';
import { MCPServerCard } from '@/components/mcp-server-card';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Filter servers based on search and status
  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         server.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const status = server.connectionState?.status || 'disconnected';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Status: {statusFilter === 'all' ? 'All' : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Servers
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('connected')}>
                Connected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('disconnected')}>
                Disconnected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('error')}>
                Error
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-sm text-gray-600">
            {filteredServers.length} of {servers.length} servers
          </div>
        </div>

        {/* Stats Grid */}
        {stats && <CleanStatsGrid stats={stats} />}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Servers List */}
          <div className="lg:col-span-2 space-y-4">
            {servers.length === 0 ? (
              <EmptyServersState onAddServer={() => setIsServerDialogOpen(true)} />
            ) : filteredServers.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No servers found</h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    No servers match your current search and filter criteria.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredServers.map((server) => (
                <MCPServerCard 
                  key={server.id} 
                  server={server}
                  onUpdate={(updatedServer) => {
                    setServers(prev => prev.map(s => 
                      s.id === updatedServer.id ? updatedServer : s
                    ));
                    loadDashboardData();
                  }}
                  onDelete={(serverId) => {
                    setServers(prev => prev.filter(s => s.id !== serverId));
                    loadDashboardData();
                  }}
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

// Enhanced activity panel
function CleanActivityPanel() {
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: 'connection',
      server: 'Deal Cloud',
      message: 'Successfully connected',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      status: 'success'
    },
    {
      id: 2,
      type: 'tool_execution', 
      server: 'Deal Cloud',
      message: 'Executed search_deals tool',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'success'
    },
    {
      id: 3,
      type: 'tool_toggle',
      server: 'Deal Cloud', 
      message: 'Enabled create_deal tool',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'info'
    }
  ]);

  const getActivityIcon = (type: string, status: string) => {
    if (type === 'connection') {
      return status === 'success' ? (
        <CheckCircle2 className="w-3 h-3 text-green-600" />
      ) : (
        <AlertCircle className="w-3 h-3 text-red-600" />
      );
    }
    if (type === 'tool_execution') {
      return <Terminal className="w-3 h-3 text-blue-600" />;
    }
    return <Circle className="w-3 h-3 text-gray-600" />;
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-sm text-gray-600 text-center py-8">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 py-2">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.server}</span>
                  </p>
                  <p className="text-xs text-gray-600">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced quick actions
function CleanQuickActions({ onRefresh }: { onRefresh: () => void }) {
  const [isConnectingAll, setIsConnectingAll] = useState(false);
  const [isDisconnectingAll, setIsDisconnectingAll] = useState(false);

  const handleConnectAll = async () => {
    setIsConnectingAll(true);
    try {
      // TODO: Implement bulk connect API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      onRefresh();
    } catch (error) {
      console.error('Failed to connect all servers:', error);
    } finally {
      setIsConnectingAll(false);
    }
  };

  const handleDisconnectAll = async () => {
    setIsDisconnectingAll(true);
    try {
      // TODO: Implement bulk disconnect API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      onRefresh();
    } catch (error) {
      console.error('Failed to disconnect all servers:', error);
    } finally {
      setIsDisconnectingAll(false);
    }
  };

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
            <RefreshCw className="w-3 h-3 mr-2" />
            Refresh All
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-sm h-8 text-green-700 hover:text-green-800 hover:bg-green-50"
            onClick={handleConnectAll}
            disabled={isConnectingAll}
          >
            <CheckCircle2 className="w-3 h-3 mr-2" />
            {isConnectingAll ? 'Connecting...' : 'Connect All'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start text-sm h-8 text-orange-700 hover:text-orange-800 hover:bg-orange-50"
            onClick={handleDisconnectAll}
            disabled={isDisconnectingAll}
          >
            <Circle className="w-3 h-3 mr-2" />
            {isDisconnectingAll ? 'Disconnecting...' : 'Disconnect All'}
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