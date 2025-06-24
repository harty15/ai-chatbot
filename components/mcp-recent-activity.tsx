'use client';

import { formatDistanceToNow } from 'date-fns';
import { 
  Zap, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MCPRecentActivity } from '@/lib/ai/mcp-types';

interface MCPRecentActivityProps {
  activities: MCPRecentActivity[];
}

export function MCPRecentActivity({ activities }: MCPRecentActivityProps) {
  const getActivityIcon = (type: string, status: string) => {
    switch (type) {
      case 'tool_execution':
        if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
        return <Clock className="w-4 h-4 text-yellow-500" />;
      
      case 'connection':
        if (status === 'success') return <RefreshCw className="w-4 h-4 text-green-500" />;
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      
      case 'server_added':
        return <Plus className="w-4 h-4 text-blue-500" />;
      
      case 'server_removed':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="text-xs">Success</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Pending</Badge>;
      default:
        return null;
    }
  };

  const formatActivityMessage = (activity: MCPRecentActivity) => {
    switch (activity.type) {
      case 'tool_execution':
        return `Executed ${activity.toolName} on ${activity.serverName}`;
      case 'connection':
        return activity.status === 'success' 
          ? `Connected to ${activity.serverName}`
          : `Failed to connect to ${activity.serverName}`;
      case 'server_added':
        return `Added server ${activity.serverName}`;
      case 'server_removed':
        return `Removed server ${activity.serverName}`;
      default:
        return activity.message;
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">
          Tool executions and server events will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div 
          key={activity.id} 
          className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.type, activity.status)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {formatActivityMessage(activity)}
              </p>
              {getStatusBadge(activity.status)}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
              
              {activity.toolName && activity.type === 'tool_execution' && (
                <>
                  <span>•</span>
                  <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                    {activity.toolName}
                  </span>
                </>
              )}
            </div>

            {/* Show error details if available */}
            {activity.status === 'error' && activity.message && (
              <p className="text-xs text-red-600 mt-1 truncate">
                {activity.message}
              </p>
            )}
          </div>
        </div>
      ))}

      {activities.length >= 10 && (
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Showing last 10 activities
          </p>
        </div>
      )}
    </div>
  );
}