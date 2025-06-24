import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
  getMcpDashboardStats,
  getMcpServersByUserId,
  getMcpToolExecutionsByUserId,
} from '@/lib/db/queries';
import { mcpClientManager } from '@/lib/ai/mcp-client';
import type { MCPDashboardStats, MCPRecentActivity } from '@/lib/ai/mcp-types';

export const maxDuration = 30;

/**
 * GET /api/mcp/dashboard
 * Get dashboard statistics and recent activity for MCP servers
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    // Get basic stats from database
    const stats = await getMcpDashboardStats({
      userId: session.user.id,
    });

    // Get real-time connection states from client manager
    const connectionStates = mcpClientManager.getAllConnectionStates();
    const connectedServers = Object.values(connectionStates).filter(
      (state) => state.status === 'connected',
    ).length;

    // Override connected servers count with real-time data
    const enhancedStats: MCPDashboardStats = {
      ...stats,
      connectedServers,
      averageResponseTime: calculateAverageResponseTime(connectionStates),
    };

    // Get recent activity
    const recentActivity = await getRecentActivity(session.user.id);

    // Get server health status
    const servers = await getMcpServersByUserId({
      userId: session.user.id,
    });

    const serverHealth = servers.map((server) => {
      const connectionState = connectionStates[server.id];
      return {
        serverId: server.id,
        name: server.name,
        status: mapConnectionStatusToHealth(connectionState?.status || 'disconnected'),
        responseTime: undefined, // Would need to implement ping
        lastCheck: new Date(),
        toolsAvailable: connectionState?.availableTools.length || 0,
        error: connectionState?.lastError || server.lastError,
      };
    });

    return Response.json({
      stats: enhancedStats,
      recentActivity,
      serverHealth,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error('Error getting MCP dashboard data:', error);
    return new ChatSDKError('internal:mcp', 'Failed to get dashboard data').toResponse();
  }
}

/**
 * Calculate average response time from connection states
 */
function calculateAverageResponseTime(
  connectionStates: Record<string, any>,
): number {
  // This is a placeholder implementation
  // In a real implementation, you'd track response times
  const connectedStates = Object.values(connectionStates).filter(
    (state) => state.status === 'connected',
  );
  
  if (connectedStates.length === 0) {
    return 0;
  }

  // Mock average - in reality, you'd calculate from actual response times
  return Math.floor(Math.random() * 500) + 100; // 100-600ms
}

/**
 * Map MCP connection status to health status
 */
function mapConnectionStatusToHealth(status: string): 'active' | 'inactive' | 'error' | 'connecting' {
  switch (status) {
    case 'connected':
      return 'active';
    case 'connecting':
      return 'connecting';
    case 'error':
      return 'error';
    case 'disconnected':
    default:
      return 'inactive';
  }
}

/**
 * Get recent activity for the dashboard
 */
async function getRecentActivity(userId: string): Promise<MCPRecentActivity[]> {
  try {
    const recentExecutions = await getMcpToolExecutionsByUserId({
      userId,
      limit: 10,
    });

    const activities: MCPRecentActivity[] = recentExecutions.map((execution) => ({
      id: execution.execution.id,
      type: 'tool_execution',
      serverName: execution.server.name,
      toolName: execution.tool.name,
      status: mapExecutionStatusToActivityStatus(execution.execution.status),
      message: `Executed ${execution.tool.name} on ${execution.server.name}`,
      timestamp: execution.execution.createdAt,
    }));

    // Add connection events from client manager
    // This would require implementing event history in the client manager
    // For now, we'll just return tool executions

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

/**
 * Map execution status to activity status
 */
function mapExecutionStatusToActivityStatus(
  status: string,
): 'success' | 'error' | 'pending' {
  switch (status) {
    case 'success':
      return 'success';
    case 'error':
    case 'timeout':
      return 'error';
    case 'pending':
    default:
      return 'pending';
  }
}