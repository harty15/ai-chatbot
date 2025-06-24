'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Terminal, Globe, Lightbulb, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MCP_SERVER_TEMPLATES, type MCPServerTemplate } from '@/lib/ai/mcp-types';
import { cn } from '@/lib/utils';

const serverSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100),
  description: z.string().optional(),
  transportType: z.enum(['sse']).default('sse'),
  url: z.string().url('Please enter a valid URL'),
  maxRetries: z.number().min(0).max(10).optional(),
  retryDelay: z.number().min(100).max(10000).optional(),
  timeout: z.number().min(5000).max(60000).optional(),
  isEnabled: z.boolean().optional(),
});

type ServerFormData = z.infer<typeof serverSchema>;

interface CleanServerFormProps {
  server?: any;
  onSuccess: (server: any) => void;
  onCancel: () => void;
}

export function MCPCleanServerForm({ server, onSuccess, onCancel }: CleanServerFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(server ? 'manual' : 'templates');

  // Form state persistence key
  const formStateKey = `mcp-form-${server?.id || 'new'}`;

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
      transportType: 'sse' as const,
      url: server?.url || '',
      maxRetries: server?.maxRetries || 3,
      retryDelay: server?.retryDelay || 1000,
      timeout: server?.timeout || 30000,
      isEnabled: server?.isEnabled !== false,
    },
  });

  // Watch all form values for persistence
  const watchedValues = watch();

  // Save form state to sessionStorage
  useEffect(() => {
    if (!server && watchedValues.name) { // Only persist for new servers with content
      try {
        sessionStorage.setItem(formStateKey, JSON.stringify(watchedValues));
      } catch (error) {
        console.warn('Failed to save form state:', error);
      }
    }
  }, [watchedValues, formStateKey, server]);

  // Restore form state from sessionStorage
  useEffect(() => {
    if (!server) { // Only restore for new servers
      try {
        const savedState = sessionStorage.getItem(formStateKey);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          Object.entries(parsedState).forEach(([key, value]) => {
            if (value) {
              setValue(key as keyof ServerFormData, value);
            }
          });
        }
      } catch (error) {
        console.warn('Failed to restore form state:', error);
      }
    }
  }, [server, formStateKey, setValue]);

  const transportType = watch('transportType');

  const applyTemplate = (template: MCPServerTemplate) => {
    setValue('name', template.name);
    setValue('description', template.description);
    setValue('transportType', 'sse');
    setValue('url', template.transport.url);
    setActiveTab('manual');
  };

  const onSubmit = async (data: ServerFormData) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...data,
        transportType: 'sse' as const,
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
      
      setSuccess(true);
      
      // Clear saved form state on successful submission
      if (!server) {
        try {
          sessionStorage.removeItem(formStateKey);
        } catch (error) {
          console.warn('Failed to clear form state:', error);
        }
      }
      
      // Call onSuccess immediately to prevent page refresh issues
      onSuccess(result.server);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="templates" className="text-sm">Templates</TabsTrigger>
          <TabsTrigger value="manual" className="text-sm">Manual Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="space-y-1 mb-6">
            <h3 className="text-lg font-medium">Choose a Template</h3>
            <p className="text-sm text-gray-600">
              Get started quickly with popular MCP servers
            </p>
          </div>

          <div className="grid gap-3">
            {MCP_SERVER_TEMPLATES.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                onSelect={applyTemplate}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <p className="text-sm text-gray-600">
                  Configure your MCP server details
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Server Name *
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., GitHub Tools"
                    className="h-9"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Input
                    id="description"
                    {...register('description')}
                    placeholder="Optional description"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Server Configuration */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-medium">Server Configuration</h3>
                <p className="text-sm text-gray-600">
                  Configure your SSE-based MCP server connection
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-700">
                    <strong>Cloud compatible:</strong> SSE servers work in any deployment environment including Vercel, Netlify, and other cloud platforms.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium">
                    Server URL *
                  </Label>
                  <Input
                    id="url"
                    {...register('url')}
                    placeholder="https://your-mcp-server.com/mcp"
                    className="h-9"
                  />
                  {errors.url && (
                    <p className="text-xs text-red-600">{errors.url.message}</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || success} className="min-w-[100px]">
                {success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    {server ? 'Updated' : 'Created'}
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

// Template card component
function TemplateCard({ 
  template, 
  onSelect 
}: { 
  template: MCPServerTemplate; 
  onSelect: (template: MCPServerTemplate) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    if (template.transport.type === 'stdio') {
      const command = `${template.transport.command} ${template.transport.args?.join(' ') || ''}`.trim();
      navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card 
      className="group cursor-pointer border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
      onClick={() => onSelect(template)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              {template.transport.type === 'stdio' ? (
                <Terminal className="w-4 h-4 text-gray-600" />
              ) : (
                <Globe className="w-4 h-4 text-gray-600" />
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <Badge variant="outline" className="text-xs px-2 py-0">
                  {template.transport.type}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              
              <div className="mt-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                  {template.transport.url}
                </code>
              </div>
              
              {template.setupInstructions && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700">
                      <strong>Setup:</strong> {template.setupInstructions}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(template.transport.url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}