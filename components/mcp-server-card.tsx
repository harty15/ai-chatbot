'use client';

import { useState } from 'react';
import {
  Server,
  Play,
  Square,
  RefreshCw,
  Settings,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Terminal,
  Globe,
  Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MCPServerForm } from '@/components/mcp-server-form';
import { MCPToolsDropdown } from '@/components/mcp-tools-dropdown';
import { MCPAdvancedSettingsModal } from '@/components/mcp-advanced-settings-modal';
import type { MCPServerWithTools } from '@/lib/ai/mcp-types';

interface MCPServerCardProps {
  server: MCPServerWithTools;
  onUpdate: (server: any) => void;
  onDelete: (serverId: string) => void;
}

export function MCPServerCard({
  server,
  onUpdate,
  onDelete,
}: MCPServerCardProps) {
  const [loading, setLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    tools: Array<{ name: string; description: string }>;
    toolCount: number;
  } | null>(null);

  const connectionStatus = server.connectionState?.status || 'disconnected';
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const hasError = connectionStatus === 'error';

  // Handle connection actions
  const handleConnectionAction = async (
    action: 'connect' | 'disconnect' | 'reconnect' | 'test',
  ) => {
    try {
      setLoading(true);
      setActionLoading(action);
      setError(null);

      // Optimistic UI update for connection actions
      if (action === 'connect') {
        onUpdate({
          ...server,
          connectionState: {
            status: 'connecting',
            availableTools: [],
            retryCount: 0,
          },
        });
      }

      const response = await fetch(`/api/mcp/servers/${server.id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to ${action} server`);
      }

      // Show test results if it's a test action
      if (action === 'test') {
        if (result.success) {
          setTestResults({
            success: true,
            tools: result.testResults.tools || [],
            toolCount: result.testResults.toolCount || 0,
          });
          setError(
            `✅ Test successful! ${result.testResults.toolCount} tools available`,
          );
        } else {
          setTestResults(null);
          setError(`❌ Test failed: ${result.error}`);
        }
        return; // Don't update server state for test
      }

      // Clear test results when doing actual connection
      setTestResults(null);
      
      // Update server state with the API response
      if (result.server) {
        // Use the complete server object from API response
        onUpdate(result.server);
      } else if (result.connectionState) {
        // Fallback to connectionState if server object not available
        onUpdate({
          ...server,
          connectionState: result.connectionState,
          connectionStatus: result.connectionState.status,
          lastConnected: action === 'connect' ? new Date().toISOString() : server.lastConnected,
        });
      }

      // Additional fetch as secondary verification (optional)
      try {
        const serverResponse = await fetch(`/api/mcp/servers/${server.id}`);
        if (serverResponse.ok) {
          const data = await serverResponse.json();
          onUpdate(data.server);
        }
      } catch (fetchError) {
        console.warn('Failed to fetch updated server state:', fetchError);
        // Don't throw - we already have the connection result
      }
    } catch (err) {
      // Revert optimistic update on error
      if (action === 'connect') {
        onUpdate({
          ...server,
          connectionState: {
            status: 'error',
            availableTools: [],
            retryCount: 0,
            lastError: err instanceof Error ? err.message : 'Connection failed',
          },
        });
      }
      
      setError(
        err instanceof Error ? err.message : `Failed to ${action} server`,
      );
    } finally {
      setLoading(false);
      setActionLoading(null);
    }
  };

  // Handle server enabled/disabled toggle
  const handleToggleEnabled = async (isEnabled: boolean) => {
    try {
      setToggleLoading(true);
      setError(null);

      const response = await fetch(`/api/mcp/servers/${server.id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle server');
      }

      const result = await response.json();
      console.log(
        `🔄 Server ${server.name} ${isEnabled ? 'enabled' : 'disabled'}`,
      );

      // Update the server state optimistically
      const updatedServer = {
        ...server,
        isEnabled,
      };

      onUpdate(updatedServer);
    } catch (err) {
      console.error('❌ Failed to toggle server:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle server');
    } finally {
      setToggleLoading(false);
    }
  };

  // Handle server deletion
  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/mcp/servers/${server.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete server');
      }

      onDelete(server.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isConnecting || loading) {
      return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    }
    if (isConnected) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (hasError) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <div className="w-4 h-4 rounded-full bg-gray-300" />;
  };

  const getStatusText = () => {
    if (isConnecting || loading) return 'Connecting...';
    if (isConnected) return 'Connected';
    if (hasError) return 'Error';
    return 'Disconnected';
  };

  const getStatusColor = () => {
    if (isConnecting || loading) return 'secondary';
    if (isConnected) return 'default';
    if (hasError) return 'destructive';
    return 'outline';
  };

  return (
    <Card
      className={`hover:shadow-md transition-all duration-200 ${
        !server.isEnabled ? 'opacity-60 border-dashed border-gray-300' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              {server.transportType === 'stdio' ? (
                <Terminal className="w-5 h-5 text-gray-600" />
              ) : (
                <Globe className="w-5 h-5 text-gray-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">
                  {server.name}
                </h3>
                {getStatusIcon()}
              </div>

              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {server.description || 'No description provided'}
              </p>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Badge variant={getStatusColor() as any} className="text-xs">
                  {getStatusText()}
                </Badge>

                {!server.isEnabled && (
                  <Badge
                    variant="secondary"
                    className="text-xs text-red-600 bg-red-50"
                  >
                    Disabled
                  </Badge>
                )}

                <Badge variant="outline" className="text-xs">
                  {server.transportType.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Switch
              checked={server.isEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={loading || toggleLoading}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Connection Details */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Connection:</div>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block truncate">
            {server.transportType === 'stdio'
              ? `${server.command} ${server.args?.join(' ') || ''}`
              : server.url}
          </code>
        </div>

        {/* Tools Dropdown */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">Tools Management:</div>
          <MCPToolsDropdown
            server={server}
            testResults={testResults}
            onToolToggle={(toolId, enabled) => {
              console.log(`Tool ${toolId} ${enabled ? 'enabled' : 'disabled'}`);
              // TODO: Implement tool toggle API call
            }}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {server.connectionState?.lastError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {server.connectionState.lastError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Connection Controls */}
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConnectionAction('disconnect')}
              disabled={loading}
              className="gap-1"
            >
              <Square className="w-3 h-3" />
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConnectionAction('connect')}
              disabled={loading || !server.isEnabled}
              className="gap-1"
            >
              <Play className="w-3 h-3" />
              Connect
            </Button>
          )}

          {/* Test Connection Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnectionAction('test')}
                disabled={loading}
                className="px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Zap className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Test Connection</TooltipContent>
          </Tooltip>

          {(isConnected || hasError) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectionAction('reconnect')}
                  disabled={loading || !server.isEnabled}
                  className="px-2"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reconnect</TooltipContent>
            </Tooltip>
          )}

          <div className="flex-1" />

          {/* Advanced Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setIsAdvancedSettingsOpen(true)}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Advanced Settings</TooltipContent>
          </Tooltip>

          {/* Server Management */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Edit className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit MCP Server</DialogTitle>
              </DialogHeader>
              <MCPServerForm
                server={server}
                onSuccess={(updatedServer) => {
                  onUpdate(updatedServer);
                  setIsEditDialogOpen(false);
                }}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{server.name}"? This action
                  cannot be undone. All associated tools and execution history
                  will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={loading}
                >
                  Delete Server
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Last Connected */}
        {server.lastConnected && (
          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            Last connected: {new Date(server.lastConnected).toLocaleString()}
          </div>
        )}
      </CardContent>

      {/* Advanced Settings Modal */}
      <MCPAdvancedSettingsModal
        server={server}
        isOpen={isAdvancedSettingsOpen}
        onClose={() => setIsAdvancedSettingsOpen(false)}
        onSave={(settings) => {
          console.log('Saving advanced settings:', settings);
          // TODO: Implement API call to save advanced settings
        }}
      />
    </Card>
  );
}
