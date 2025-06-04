'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Key,
  TestTube,
  CheckCircle,
  XCircle,
  Loader,
  ArrowLeft,
  Save,
  Power,
  Wrench,
  Trash2,
} from 'lucide-react';
import type { UserMCPConfig, MCPServer } from '@/lib/db/schema';
import { toast } from 'sonner';

interface MCPConfigurePageProps {
  mcpServerId: string;
  userConfig: UserMCPConfig;
  mcpServer: MCPServer;
  userId: string;
}

interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  description?: string;
  placeholder?: string;
}

interface MCPCredentialsForm {
  [key: string]: string;
}

interface ToolConfig {
  name: string;
  enabled: boolean;
  description?: string;
}

export function MCPConfigurePage({
  mcpServerId,
  userConfig,
  mcpServer,
  userId,
}: MCPConfigurePageProps) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(userConfig.enabled);
  const [credentials, setCredentials] = useState<MCPCredentialsForm>({});
  const [toolConfigs, setToolConfigs] = useState<ToolConfig[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'success' | 'error' | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize credential fields from server schema
  const getCredentialFields = (): CredentialField[] => {
    if (
      mcpServer.schemaConfig &&
      (mcpServer.schemaConfig as any).credentialFields
    ) {
      return (mcpServer.schemaConfig as any).credentialFields;
    }

    // Fallback based on transport config
    const fields: CredentialField[] = [];
    const transportConfig = mcpServer.transportConfig as any;

    if (transportConfig.requiresApiKey) {
      fields.push({
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Your API key for this service',
      });
    }

    return fields;
  };

  const credentialFields = getCredentialFields();

  // Initialize form state
  useEffect(() => {
    const initialCredentials: MCPCredentialsForm = {};
    credentialFields.forEach((field) => {
      initialCredentials[field.name] = '';
    });
    setCredentials(initialCredentials);

    // Load available tools (this would come from MCP server discovery)
    // For now, we'll show placeholder tools
    setToolConfigs([
      { name: 'search', enabled: true, description: 'Search through content' },
      { name: 'create', enabled: true, description: 'Create new items' },
      { name: 'update', enabled: false, description: 'Update existing items' },
      { name: 'delete', enabled: false, description: 'Delete items' },
    ]);
  }, [credentialFields]);

  const handleCredentialChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSaveCredentials = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mcp/credentials/${mcpServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });

      if (response.ok) {
        toast.success('Credentials saved successfully');
      } else {
        toast.error('Failed to save credentials');
      }
    } catch (error) {
      toast.error('Failed to save credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await fetch(`/api/mcp/test/${mcpServerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast.success('Connection test successful');
      } else {
        setConnectionStatus('error');
        toast.error('Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mcp/servers/${mcpServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setIsEnabled(enabled);
        toast.success(`MCP ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to update MCP status');
      }
    } catch (error) {
      toast.error('Failed to update MCP status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolToggle = async (toolName: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/mcp/tools/${mcpServerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, enabled }),
      });

      if (response.ok) {
        setToolConfigs((prev) =>
          prev.map((tool) =>
            tool.name === toolName ? { ...tool, enabled } : tool,
          ),
        );
        toast.success(`Tool ${toolName} ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to update tool configuration');
      }
    } catch (error) {
      toast.error('Failed to update tool configuration');
    }
  };

  const handleRemoveMCP = async () => {
    if (
      !confirm(
        'Are you sure you want to remove this MCP server? This action cannot be undone.',
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/mcp/servers/${mcpServerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('MCP server removed successfully');
        router.push('/mcps');
      } else {
        toast.error('Failed to remove MCP server');
      }
    } catch (error) {
      toast.error('Failed to remove MCP server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/mcps')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MCPs
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {mcpServer.iconUrl ? (
              <img
                src={mcpServer.iconUrl}
                alt={mcpServer.name}
                className="w-12 h-12 rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Settings className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{mcpServer.name}</h1>
              <p className="text-muted-foreground">{mcpServer.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mcpServer.isCurated && <Badge variant="secondary">Curated</Badge>}
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
                disabled={isLoading}
              />
              <span className="text-sm font-medium">
                {isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credentials Section */}
          {credentialFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Credentials
                </CardTitle>
                <CardDescription>
                  Configure authentication credentials for this MCP server.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {credentialFields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder || field.description}
                      value={credentials[field.name] || ''}
                      onChange={(e) =>
                        handleCredentialChange(field.name, e.target.value)
                      }
                    />
                    {field.description && (
                      <p className="text-sm text-muted-foreground">
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'success' && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Connection successful</span>
                      </div>
                    )}
                    {connectionStatus === 'error' && (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Connection failed</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                    >
                      {testingConnection ? (
                        <Loader className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-1" />
                      )}
                      Test Connection
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveCredentials}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Credentials
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tools Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Available Tools
              </CardTitle>
              <CardDescription>
                Enable or disable individual tools provided by this MCP server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEnabled ? (
                <div className="space-y-3">
                  {toolConfigs.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        {tool.description && (
                          <div className="text-sm text-muted-foreground">
                            {tool.description}
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={tool.enabled}
                        onCheckedChange={(enabled) =>
                          handleToolToggle(tool.name, enabled)
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Enable this MCP server to configure individual tools.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={isEnabled ? 'default' : 'outline'}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Transport
                  </span>
                  <Badge variant="outline">{mcpServer.transportType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tools</span>
                  <span className="text-sm">
                    {toolConfigs.filter((t) => t.enabled).length}/
                    {toolConfigs.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Server Info */}
          <Card>
            <CardHeader>
              <CardTitle>Server Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Transport Type:</span>
                  <br />
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {mcpServer.transportType}
                  </code>
                </div>
                {mcpServer.transportType === 'stdio_proxy' && (
                  <div>
                    <span className="text-muted-foreground">Command:</span>
                    <br />
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {(mcpServer.transportConfig as any)?.command}{' '}
                      {(mcpServer.transportConfig as any)?.args?.join(' ')}
                    </code>
                  </div>
                )}
                {mcpServer.isCurated && (
                  <div>
                    <span className="text-muted-foreground">
                      This is a curated MCP server
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Remove this MCP server from your account. This action cannot be
                undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveMCP}
                disabled={isLoading}
              >
                Remove MCP Server
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
