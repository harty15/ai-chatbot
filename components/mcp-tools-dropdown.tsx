'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MCPServerWithTools } from '@/lib/ai/mcp-types';

interface MCPToolsDropdownProps {
  server: MCPServerWithTools;
  onToolToggle?: (toolId: string, enabled: boolean) => void;
}

export function MCPToolsDropdown({ server, onToolToggle }: MCPToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toolStates, setToolStates] = useState<Record<string, boolean>>({});

  const tools = server.tools || [];
  const toolCount = tools.length;

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setToolStates(prev => ({ ...prev, [toolId]: enabled }));
    onToolToggle?.(toolId, enabled);
  };

  if (toolCount === 0) {
    return (
      <Badge variant="outline" className="text-xs text-gray-500">
        No tools available
      </Badge>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 h-auto p-2 hover:bg-blue-50"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <Badge variant="secondary" className="text-xs gap-1">
            <Zap className="w-3 h-3" />
            {toolCount} tool{toolCount !== 1 ? 's' : ''}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">Available Tools</span>
            </div>
          </div>
          
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {tools.map((tool) => (
              <div 
                key={tool.id} 
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {tool.name}
                    </code>
                  </div>
                  {tool.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {tool.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Switch
                        checked={toolStates[tool.id] ?? true}
                        onCheckedChange={(enabled) => handleToolToggle(tool.id, enabled)}
                        size="sm"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {toolStates[tool.id] ?? true ? 'Disable tool' : 'Enable tool'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{tools.filter(t => toolStates[t.id] ?? true).length} of {toolCount} enabled</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  const allEnabled = tools.every(t => toolStates[t.id] ?? true);
                  const newState = !allEnabled;
                  const newStates: Record<string, boolean> = {};
                  tools.forEach(t => {
                    newStates[t.id] = newState;
                    onToolToggle?.(t.id, newState);
                  });
                  setToolStates(newStates);
                }}
              >
                {tools.every(t => toolStates[t.id] ?? true) ? 'Disable All' : 'Enable All'}
              </Button>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}