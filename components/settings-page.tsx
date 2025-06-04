'use client';

import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Key,
  TestTube,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';
import type { UserMCPConfiguration } from '@/lib/ai/mcp/types';
import { toast } from 'sonner';

interface SettingsPageProps {
  mcpConfigs: UserMCPConfiguration[];
  userId: string;
}

interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  description?: string;
}

interface MCPCredentialsForm {
  [key: string]: string;
}

export function SettingsPage({
  mcpConfigs: initialConfigs,
  userId,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'credentials'>(
    'general',
  );
  const [mcpConfigs, setMcpConfigs] =
    useState<UserMCPConfiguration[]>(initialConfigs);
  const [credentials, setCredentials] = useState<
    Record<string, MCPCredentialsForm>
  >({});
  const [testingConnection, setTestingConnection] = useState<
    Record<string, boolean>
  >({});
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, 'success' | 'error' | null>
  >({});

  // Initialize credentials form state
  useEffect(() => {
    const initialCredentials: Record<string, MCPCredentialsForm> = {};
    mcpConfigs.forEach((config) => {
      const fields = getCredentialFields(config.server.transportConfig);
      const formData: MCPCredentialsForm = {};
      fields.forEach((field) => {
        formData[field.name] = '';
      });
      initialCredentials[config.id] = formData;
    });
    setCredentials(initialCredentials);
  }, [mcpConfigs]);

  const getCredentialFields = (
    transportConfig: any,
    schemaConfig?: any,
  ): CredentialField[] => {
    // First, check if the server has explicit credential field definitions
    if (schemaConfig?.credentialFields) {
      return schemaConfig.credentialFields;
    }

    // Fallback to parsing transport config for credential requirements
    const fields: CredentialField[] = [];

    if (transportConfig.requiresApiKey) {
      fields.push({
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Your API key for this service',
      });
    }

    if (transportConfig.requiresAuth) {
      fields.push({
        name: 'token',
        label: 'Authentication Token',
        type: 'password',
        required: true,
        description: 'Your authentication token',
      });
    }

    if (
      transportConfig.baseUrl &&
      !transportConfig.baseUrl.startsWith('http')
    ) {
      fields.push({
        name: 'baseUrl',
        label: 'Base URL',
        type: 'url',
        required: true,
        description: 'The base URL for the API endpoint',
      });
    }

    return fields;
  };

  const handleCredentialChange = (
    mcpConfigId: string,
    fieldName: string,
    value: string,
  ) => {
    setCredentials((prev) => ({
      ...prev,
      [mcpConfigId]: {
        ...prev[mcpConfigId],
        [fieldName]: value,
      },
    }));
  };

  const handleSaveCredentials = async (mcpConfigId: string) => {
    try {
      const response = await fetch(`/api/mcp/credentials/${mcpConfigId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: credentials[mcpConfigId] }),
      });

      if (response.ok) {
        toast.success('Credentials saved successfully');
      } else {
        toast.error('Failed to save credentials');
      }
    } catch (error) {
      toast.error('Failed to save credentials');
    }
  };

  const handleTestConnection = async (mcpConfigId: string) => {
    setTestingConnection((prev) => ({ ...prev, [mcpConfigId]: true }));
    setConnectionStatus((prev) => ({ ...prev, [mcpConfigId]: null }));

    try {
      const response = await fetch(`/api/mcp/test/${mcpConfigId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: credentials[mcpConfigId] }),
      });

      if (response.ok) {
        setConnectionStatus((prev) => ({ ...prev, [mcpConfigId]: 'success' }));
        toast.success('Connection test successful');
      } else {
        setConnectionStatus((prev) => ({ ...prev, [mcpConfigId]: 'error' }));
        toast.error('Connection test failed');
      }
    } catch (error) {
      setConnectionStatus((prev) => ({ ...prev, [mcpConfigId]: 'error' }));
      toast.error('Connection test failed');
    } finally {
      setTestingConnection((prev) => ({ ...prev, [mcpConfigId]: false }));
    }
  };

  const tabClass = (tab: string) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === tab
        ? 'bg-muted text-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and MCP server credentials.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-muted/50 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={tabClass('general')}
          >
            <Settings className="h-4 w-4 mr-2 inline" />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={tabClass('credentials')}
          >
            <Key className="h-4 w-4 mr-2 inline" />
            MCP Credentials
          </button>
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure your general account preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                General settings will be available in a future update. For now,
                use this page to manage your MCP credentials.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Credentials Tab */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MCP Server Credentials</CardTitle>
              <CardDescription>
                Manage authentication credentials for your MCP servers. All
                credentials are encrypted and stored securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mcpConfigs.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No MCP servers configured. Visit the{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => {
                        window.location.href = '/marketplace';
                      }}
                    >
                      Marketplace
                    </Button>{' '}
                    to add MCP servers.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {mcpConfigs.map((config) => {
                    const credentialFields = getCredentialFields(
                      config.server.transportConfig,
                      config.server.schemaConfig,
                    );

                    if (credentialFields.length === 0) {
                      return null; // Skip servers that don't require credentials
                    }

                    return (
                      <Card key={config.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {config.server.iconUrl ? (
                                <img
                                  src={config.server.iconUrl}
                                  alt={config.server.name}
                                  className="w-8 h-8 rounded"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                  <Settings className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <CardTitle className="text-lg">
                                  {config.server.name}
                                </CardTitle>
                                <CardDescription>
                                  {config.server.description}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {config.server.isCurated && (
                                <Badge variant="secondary">Curated</Badge>
                              )}
                              {config.enabled ? (
                                <Badge variant="default">Enabled</Badge>
                              ) : (
                                <Badge variant="outline">Disabled</Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {credentialFields.map((field) => (
                            <div key={field.name} className="space-y-2">
                              <Label htmlFor={`${config.id}-${field.name}`}>
                                {field.label}
                                {field.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </Label>
                              <Input
                                id={`${config.id}-${field.name}`}
                                type={field.type}
                                placeholder={field.description}
                                value={
                                  credentials[config.id]?.[field.name] || ''
                                }
                                onChange={(e) =>
                                  handleCredentialChange(
                                    config.id,
                                    field.name,
                                    e.target.value,
                                  )
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
                              {connectionStatus[config.id] === 'success' && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">
                                    Connection successful
                                  </span>
                                </div>
                              )}
                              {connectionStatus[config.id] === 'error' && (
                                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm">
                                    Connection failed
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestConnection(config.id)}
                                disabled={testingConnection[config.id]}
                              >
                                {testingConnection[config.id] ? (
                                  <Loader className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <TestTube className="h-4 w-4 mr-1" />
                                )}
                                Test Connection
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveCredentials(config.id)}
                              >
                                Save Credentials
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
