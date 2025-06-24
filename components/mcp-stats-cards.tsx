'use client';

import { Server, Zap, Activity, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MCPDashboardStats } from '@/lib/ai/mcp-types';

interface MCPStatsCardsProps {
  stats: MCPDashboardStats;
  loading?: boolean;
}

export function MCPStatsCards({ stats, loading }: MCPStatsCardsProps) {
  const successRate = stats.totalExecutions > 0 
    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
    : 0;

  const connectionRate = stats.totalServers > 0
    ? Math.round((stats.connectedServers / stats.totalServers) * 100)
    : 0;

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const statCards = [
    {
      title: 'Active Servers',
      value: `${stats.connectedServers}/${stats.totalServers}`,
      description: `${connectionRate}% connected`,
      icon: Server,
      color: stats.connectedServers === stats.totalServers && stats.totalServers > 0 
        ? 'text-green-600' 
        : stats.connectedServers === 0 
        ? 'text-red-600' 
        : 'text-yellow-600',
      bgColor: stats.connectedServers === stats.totalServers && stats.totalServers > 0
        ? 'bg-green-100' 
        : stats.connectedServers === 0 
        ? 'bg-red-100' 
        : 'bg-yellow-100',
    },
    {
      title: 'Available Tools',
      value: stats.enabledTools.toString(),
      description: `${stats.totalTools} total tools`,
      icon: Zap,
      color: stats.enabledTools > 0 ? 'text-blue-600' : 'text-gray-600',
      bgColor: stats.enabledTools > 0 ? 'bg-blue-100' : 'bg-gray-100',
    },
    {
      title: 'Tool Executions',
      value: stats.totalExecutions.toString(),
      description: `${successRate}% success rate`,
      icon: Activity,
      color: successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600',
      bgColor: successRate >= 90 ? 'bg-green-100' : successRate >= 70 ? 'bg-yellow-100' : 'bg-red-100',
    },
    {
      title: 'Avg Response Time',
      value: formatResponseTime(stats.averageResponseTime),
      description: 'Across all tools',
      icon: Clock,
      color: stats.averageResponseTime < 500 
        ? 'text-green-600' 
        : stats.averageResponseTime < 2000 
        ? 'text-yellow-600' 
        : 'text-red-600',
      bgColor: stats.averageResponseTime < 500 
        ? 'bg-green-100' 
        : stats.averageResponseTime < 2000 
        ? 'bg-yellow-100' 
        : 'bg-red-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
              </CardTitle>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-1" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                
                {/* Trend indicators for specific stats */}
                {index === 2 && stats.totalExecutions > 0 && (
                  <Badge 
                    variant={successRate >= 90 ? "default" : successRate >= 70 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {successRate >= 90 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : null}
                    {successRate}%
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-gray-600 mt-1">
                {stat.description}
              </p>

              {/* Additional context for specific stats */}
              {index === 0 && stats.totalServers === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No servers configured
                </p>
              )}
              
              {index === 1 && stats.totalTools > stats.enabledTools && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalTools - stats.enabledTools} disabled
                </p>
              )}

              {index === 2 && stats.failedExecutions > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {stats.failedExecutions} failed
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}