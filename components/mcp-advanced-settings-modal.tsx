'use client';

import { useState } from 'react';
import { Settings, Network, Clock, Code, Shield, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { MCPServerWithTools } from '@/lib/ai/mcp-types';

interface MCPAdvancedSettingsModalProps {
  server: MCPServerWithTools;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
}

export function MCPAdvancedSettingsModal({ 
  server, 
  isOpen, 
  onClose, 
  onSave 
}: MCPAdvancedSettingsModalProps) {
  const [settings, setSettings] = useState({
    connectionTimeout: 30000,
    maxRetries: 3,
    autoReconnect: true,
    enableLogging: true,
    logLevel: 'info',
    rateLimit: 100,
    environmentVariables: [] as Array<{ key: string; value: string }>,
    securitySettings: {
      allowFileAccess: false,
      allowNetworkAccess: true,
      sandboxMode: true,
    },
  });

  const addEnvironmentVariable = () => {
    setSettings(prev => ({
      ...prev,
      environmentVariables: [...prev.environmentVariables, { key: '', value: '' }]
    }));
  };

  const removeEnvironmentVariable = (index: number) => {
    setSettings(prev => ({
      ...prev,
      environmentVariables: prev.environmentVariables.filter((_, i) => i !== index)
    }));
  };

  const updateEnvironmentVariable = (index: number, field: 'key' | 'value', value: string) => {
    setSettings(prev => ({
      ...prev,
      environmentVariables: prev.environmentVariables.map((env, i) => 
        i === index ? { ...env, [field]: value } : env
      )
    }));
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Advanced Settings - {server.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Connection
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connection Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Connection Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={settings.connectionTimeout}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      connectionTimeout: parseInt(e.target.value) 
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retries">Max Retries</Label>
                  <Input
                    id="retries"
                    type="number"
                    value={settings.maxRetries}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      maxRetries: parseInt(e.target.value) 
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-reconnect"
                  checked={settings.autoReconnect}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    autoReconnect: checked 
                  }))}
                />
                <Label htmlFor="auto-reconnect">Enable auto-reconnect</Label>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Server Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Transport:</span>
                    <Badge variant="outline" className="ml-2">
                      {server.transportType.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Tools:</span>
                    <Badge variant="secondary" className="ml-2">
                      {server.tools?.length || 0}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Performance Settings</h3>
              
              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={settings.rateLimit}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    rateLimit: parseInt(e.target.value) 
                  }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="logging"
                  checked={settings.enableLogging}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    enableLogging: checked 
                  }))}
                />
                <Label htmlFor="logging">Enable detailed logging</Label>
              </div>

              {settings.enableLogging && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="log-level">Log Level</Label>
                  <select
                    id="log-level"
                    value={settings.logLevel}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      logLevel: e.target.value 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Environment Variables</h3>
                <Button onClick={addEnvironmentVariable} size="sm" variant="outline">
                  Add Variable
                </Button>
              </div>
              
              <div className="space-y-3">
                {settings.environmentVariables.map((env, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="KEY"
                      value={env.key}
                      onChange={(e) => updateEnvironmentVariable(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <span>=</span>
                    <Input
                      placeholder="value"
                      value={env.value}
                      onChange={(e) => updateEnvironmentVariable(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeEnvironmentVariable(index)}
                      size="sm"
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                
                {settings.environmentVariables.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No environment variables configured
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="file-access"
                    checked={settings.securitySettings.allowFileAccess}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      securitySettings: { ...prev.securitySettings, allowFileAccess: checked }
                    }))}
                  />
                  <Label htmlFor="file-access">Allow file system access</Label>
                  {settings.securitySettings.allowFileAccess && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      High Risk
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="network-access"
                    checked={settings.securitySettings.allowNetworkAccess}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      securitySettings: { ...prev.securitySettings, allowNetworkAccess: checked }
                    }))}
                  />
                  <Label htmlFor="network-access">Allow network access</Label>
                  {settings.securitySettings.allowNetworkAccess && (
                    <Badge variant="secondary" className="ml-2">
                      Medium Risk
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="sandbox"
                    checked={settings.securitySettings.sandboxMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ 
                      ...prev, 
                      securitySettings: { ...prev.securitySettings, sandboxMode: checked }
                    }))}
                  />
                  <Label htmlFor="sandbox">Enable sandbox mode</Label>
                  {settings.securitySettings.sandboxMode && (
                    <Badge variant="default" className="ml-2">
                      Recommended
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-amber-800">Security Notice</span>
                </div>
                <p className="text-sm text-amber-700">
                  Modifying security settings can impact system safety. Only enable elevated 
                  permissions for trusted MCP servers from verified sources.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}