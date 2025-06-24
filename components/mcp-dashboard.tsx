'use client';

import { useState, useEffect } from 'react';
import { Plus, Server, Activity, Zap, AlertCircle, CheckCircle2, Clock, Settings } from 'lucide-react';
import type { Session } from 'next-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MCPServerForm } from '@/components/mcp-server-form';
import { MCPServerCard } from '@/components/mcp-server-card';
import { MCPStatsCards } from '@/components/mcp-stats-cards';
import { MCPRecentActivity } from '@/components/mcp-recent-activity';
import { MCPDashboardSkeleton } from '@/components/mcp-server-skeleton';
import { AnimatedServerCard } from '@/components/mcp-animated-card';
import { MCPAnimatedStats, MCPActivityFeed } from '@/components/mcp-animated-stats';
import { MCPFloatingActions } from '@/components/mcp-floating-actions';
import { MCPNetworkIndicator } from '@/components/mcp-network-indicator';
import type {
  MCPServerWithTools,
  MCPDashboardStats,
  MCPRecentActivity as Activity,
  MCPHealthCheck,
} from '@/lib/ai/mcp-types';

interface MCPDashboardProps {
  session: Session;
}

export function MCPDashboard({ session }: MCPDashboardProps) {
  const [servers, setServers] = useState<MCPServerWithTools[]>([]);
  const [stats, setStats] = useState<MCPDashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [serverHealth, setServerHealth] = useState<MCPHealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServerDialogOpen, setIsServerDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [serversResponse, dashboardResponse] = await Promise.all([
        fetch('/api/mcp/servers'),
        fetch('/api/mcp/dashboard'),
      ]);

      if (!serversResponse.ok || !dashboardResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const serversData = await serversResponse.json();
      const dashboardData = await dashboardResponse.json();

      setServers(serversData.servers || []);
      setStats(dashboardData.stats);
      setRecentActivity(dashboardData.recentActivity || []);
      setServerHealth(dashboardData.serverHealth || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadDashboardData, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Handle server creation
  const handleServerCreated = (newServer: any) => {
    setServers(prev => [newServer, ...prev]);
    setIsServerDialogOpen(false);
    loadDashboardData(); // Refresh stats
  };

  // Handle server update
  const handleServerUpdated = (updatedServer: any) => {
    setServers(prev => 
      prev.map(server => 
        server.id === updatedServer.id ? { ...server, ...updatedServer } : server
      )
    );
    loadDashboardData(); // Refresh stats
  };

  // Handle server deletion
  const handleServerDeleted = (serverId: string) => {
    setServers(prev => prev.filter(server => server.id !== serverId));
    loadDashboardData(); // Refresh stats
  };

  // Handle bulk actions
  const handleConnectAll = async () => {
    const disconnectedServers = servers.filter(s => s.connectionState?.status !== 'connected');
    await Promise.allSettled(
      disconnectedServers.map(server => 
        fetch(`/api/mcp/servers/${server.id}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'connect' })
        })
      )
    );
    loadDashboardData();
  };

  const handleDisconnectAll = async () => {
    const connectedServers = servers.filter(s => s.connectionState?.status === 'connected');
    await Promise.allSettled(
      connectedServers.map(server => 
        fetch(`/api/mcp/servers/${server.id}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect' })
        })
      )
    );
    loadDashboardData();
  };

  if (loading && servers.length === 0) {
    return <MCPDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MCP Servers</h1>
            <p className="text-muted-foreground">
              Manage your Model Context Protocol server connections and tools
            </p>
          </div>
          <MCPNetworkIndicator servers={servers} />
        </div>
        
        <Dialog open={isServerDialogOpen} onOpenChange={setIsServerDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
            </DialogHeader>
            <MCPServerForm
              onSuccess={handleServerCreated}
              onCancel={() => setIsServerDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <MCPAnimatedStats 
          stats={{
            totalServers: stats.totalServers,
            connectedServers: stats.connectedServers,
            totalTools: stats.totalTools,
            totalExecutions: stats.totalExecutions,
            avgResponseTime: stats.avgResponseTime,
            successRate: stats.successRate
          }}
          loading={loading}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Servers List - Takes up 2/3 on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Servers</h2>
            <Badge variant="secondary" className="gap-1">
              <Server className="w-3 h-3" />
              {servers.length} servers
            </Badge>
          </div>

          {servers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No MCP servers configured</h3>
                <p className="text-gray-600 text-center mb-6 max-w-sm">
                  Get started by adding your first MCP server to enable powerful tools and integrations.
                </p>
                <Dialog open={isServerDialogOpen} onOpenChange={setIsServerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Server
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add MCP Server</DialogTitle>
                    </DialogHeader>
                    <MCPServerForm
                      onSuccess={handleServerCreated}
                      onCancel={() => setIsServerDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {servers.map((server, index) => (
                <AnimatedServerCard
                  key={server.id}
                  server={server}
                  onUpdate={handleServerUpdated}
                  onDelete={handleServerDeleted}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Takes up 1/3 on large screens */}
        <div className="space-y-6">
          {/* Server Health Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Server Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serverHealth.length === 0 ? (
                <p className="text-sm text-gray-500">No servers to monitor</p>
              ) : (
                serverHealth.map((health) => (
                  <div key={health.serverId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {health.status === 'active' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : health.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : health.status === 'connecting' ? (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                      )}
                      <span className="text-sm font-medium truncate">{health.serverId}</span>
                    </div>
                    <Badge 
                      variant={
                        health.status === 'active' ? 'default' :
                        health.status === 'error' ? 'destructive' :
                        health.status === 'connecting' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {health.toolsAvailable} tools
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <MCPActivityFeed activities={recentActivity} />

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={loadDashboardData}
              >
                <Activity className="w-4 h-4" />
                Refresh All Connections
              </Button>
              <Dialog open={isServerDialogOpen} onOpenChange={setIsServerDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Server
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Actions */}
      <MCPFloatingActions
        servers={servers}
        onAddServer={() => setIsServerDialogOpen(true)}
        onRefreshAll={loadDashboardData}
        onConnectAll={handleConnectAll}
        onDisconnectAll={handleDisconnectAll}
        loading={loading}
      />
    </div>
  );
}