import type { Tool } from 'ai';
import { mcpClientManager } from '../mcp/client-manager';

/**
 * Get all MCP tools for a user to include in chat requests
 */
export async function getMCPTools(userId: string): Promise<Tool[]> {
  try {
    return await mcpClientManager.getUserMCPTools(userId);
  } catch (error) {
    console.error('Failed to get MCP tools for user:', error);
    return [];
  }
}

/**
 * Get MCP status for a user (for UI indicators)
 */
export async function getMCPStatus(userId: string) {
  try {
    return await mcpClientManager.getUserMCPStatus(userId);
  } catch (error) {
    console.error('Failed to get MCP status for user:', error);
    return {};
  }
}

/**
 * Close MCP clients for a user (cleanup)
 */
export async function closeMCPClients(userId: string): Promise<void> {
  try {
    await mcpClientManager.closeUserClients(userId);
  } catch (error) {
    console.error('Failed to close MCP clients for user:', error);
  }
}
