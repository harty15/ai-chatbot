'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Terminal, Globe, Settings, Lightbulb, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MCP_SERVER_TEMPLATES, type MCPServerTemplate } from '@/lib/ai/mcp-types';

const serverSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100),
  description: z.string().optional(),
  transportType: z.enum(['stdio', 'sse']),
  command: z.string().optional(),
  args: z.string().optional(),
  env: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  maxRetries: z.number().min(0).max(10).optional(),
  retryDelay: z.number().min(100).max(10000).optional(),
  timeout: z.number().min(5000).max(60000).optional(),
  isEnabled: z.boolean().optional(),
});

type ServerFormData = z.infer<typeof serverSchema>;

interface MCPServerFormProps {
  server?: any;
  onSuccess: (server: any) => void;
  onCancel: () => void;
}

export function MCPServerForm({ server, onSuccess, onCancel }: MCPServerFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MCPServerTemplate | null>(null);
  const [activeTab, setActiveTab] = useState(server ? 'manual' : 'templates');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: server?.name || '',
      description: server?.description || '',
      transportType: server?.transportType || 'stdio',
      command: server?.command || '',
      args: server?.args ? server.args.join(' ') : '',
      env: server?.env ? JSON.stringify(server.env, null, 2) : '',
      url: server?.url || '',
      maxRetries: server?.maxRetries || 3,
      retryDelay: server?.retryDelay || 1000,
      timeout: server?.timeout || 30000,
      isEnabled: server?.isEnabled !== false,
    },
  });

  const transportType = watch('transportType');

  // Apply template to form
  const applyTemplate = (template: MCPServerTemplate) => {
    setSelectedTemplate(template);
    setValue('name', template.name);
    setValue('description', template.description);
    setValue('transportType', template.transport.type);

    if (template.transport.type === 'stdio') {
      setValue('command', template.transport.command);
      setValue('args', template.transport.args?.join(' ') || '');
      setValue('env', template.transport.env ? JSON.stringify(template.transport.env, null, 2) : '');
    } else {
      setValue('url', template.transport.url);
    }

    setActiveTab('manual');
  };

  // Copy template command
  const copyTemplateCommand = (template: MCPServerTemplate) => {
    if (template.transport.type === 'stdio') {
      const command = `${template.transport.command} ${template.transport.args?.join(' ') || ''}`.trim();
      navigator.clipboard.writeText(command);
    }
  };

  const onSubmit = async (data: ServerFormData) => {
    try {
      setLoading(true);
      setError(null);

      // Parse args and env
      const args = data.args ? data.args.split(' ').filter(Boolean) : undefined;
      const env = data.env ? JSON.parse(data.env) : undefined;

      const payload = {
        ...data,
        args,
        env,
        url: data.url || undefined,
      };

      const url = server ? `/api/mcp/servers/${server.id}` : '/api/mcp/servers';
      const method = server ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save server');
      }

      const result = await response.json();
      
      // Show success state briefly before calling onSuccess
      setSuccess(true);
      setTimeout(() => {
        onSuccess(result.server);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="manual">Manual Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="text-sm text-gray-600">
            Choose from popular MCP server templates to get started quickly.
          </div>
          
          <div className="grid gap-4">
            {MCP_SERVER_TEMPLATES.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {template.transport.type === 'stdio' 
                        ? `${template.transport.command} ${template.transport.args?.join(' ') || ''}`
                        : template.transport.url
                      }
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyTemplateCommand(template)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {template.requiresAuth && (
                    <div className="flex items-center gap-2 mb-3">
                      <Settings className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-amber-600">Requires authentication</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                    >
                      Use Template
                    </Button>
                    
                    {template.setupInstructions && (
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Setup Guide
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="My MCP Server"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportType">Transport Type *</Label>
                  <Select 
                    value={transportType} 
                    onValueChange={(value) => setValue('transportType', value as 'stdio' | 'sse')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stdio">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4" />
                          stdio (Local Process)
                        </div>
                      </SelectItem>
                      <SelectItem value="sse">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          SSE (Remote Server)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Brief description of what this server provides..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Transport Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transport Configuration</h3>
              
              {transportType === 'stdio' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="command">Command *</Label>
                    <Input
                      id="command"
                      {...register('command')}
                      placeholder="npx @modelcontextprotocol/server-github"
                    />
                    {errors.command && (
                      <p className="text-sm text-red-600">{errors.command.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="args">Arguments</Label>
                    <Input
                      id="args"
                      {...register('args')}
                      placeholder="--port 3000 --verbose"
                    />
                    <p className="text-xs text-gray-500">Space-separated command line arguments</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="env">Environment Variables</Label>
                    <Textarea
                      id="env"
                      {...register('env')}
                      placeholder='{"GITHUB_TOKEN": "ghp_...", "API_KEY": "..."}'
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">JSON object with environment variables</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="url">Server URL *</Label>
                  <Input
                    id="url"
                    {...register('url')}
                    placeholder="https://my-mcp-server.com/sse"
                    type="url"
                  />
                  {errors.url && (
                    <p className="text-sm text-red-600">{errors.url.message}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Advanced Settings</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    {...register('maxRetries', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
                  <Input
                    id="retryDelay"
                    {...register('retryDelay', { valueAsNumber: true })}
                    type="number"
                    min="100"
                    max="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    {...register('timeout', { valueAsNumber: true })}
                    type="number"
                    min="5000"
                    max="60000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Server</Label>
                  <p className="text-sm text-gray-500">
                    Server will be automatically connected when enabled
                  </p>
                </div>
                <Switch
                  {...register('isEnabled')}
                  defaultChecked={watch('isEnabled')}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || success}>
                {success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    {server ? 'Updated!' : 'Created!'}
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {server ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  server ? 'Update Server' : 'Create Server'
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}