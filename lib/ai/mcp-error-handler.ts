import { toast } from '@/components/toast';
import type { MCPError, MCPConnectionError, MCPToolExecutionError, MCPTimeoutError } from './mcp-types';

/**
 * Enhanced error handling system for MCP operations
 */
export class MCPErrorHandler {
  private static readonly ERROR_MESSAGES = {
    CONNECTION_FAILED: 'Failed to connect to MCP server',
    CONNECTION_TIMEOUT: 'Connection to MCP server timed out',
    CONNECTION_REFUSED: 'MCP server refused connection',
    AUTHENTICATION_FAILED: 'Authentication failed for MCP server',
    TOOL_NOT_FOUND: 'Requested tool not found on MCP server',
    TOOL_EXECUTION_FAILED: 'Tool execution failed',
    TOOL_TIMEOUT: 'Tool execution timed out',
    INVALID_ARGUMENTS: 'Invalid arguments provided to tool',
    SERVER_ERROR: 'MCP server returned an error',
    NETWORK_ERROR: 'Network error connecting to MCP server',
    PERMISSION_DENIED: 'Permission denied accessing MCP server',
    RATE_LIMITED: 'Rate limited by MCP server',
    UNKNOWN_ERROR: 'An unknown error occurred',
  };

  private static readonly RETRY_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff

  /**
   * Handle MCP connection errors with appropriate user feedback and retry logic
   */
  static async handleConnectionError(
    error: MCPConnectionError,
    serverId: string,
    serverName: string,
    retryCallback?: () => Promise<void>,
  ): Promise<void> {
    const errorCode = this.getErrorCode(error);
    const userMessage = this.getUserFriendlyMessage(errorCode, serverName);
    
    console.error(`MCP Connection Error [${serverId}]:`, error);

    // Show user notification
    toast(userMessage, { type: 'error' });

    // Determine if we should suggest retry
    if (this.shouldRetry(errorCode) && retryCallback) {
      // Auto-retry for transient errors
      if (this.isTransientError(errorCode)) {
        setTimeout(async () => {
          try {
            await retryCallback();
            toast(`Reconnected to ${serverName}`, { type: 'success' });
          } catch (retryError) {
            console.error(`Retry failed for server ${serverId}:`, retryError);
          }
        }, this.getRetryDelay(error.retryCount || 0));
      }
    }

    // Update server status in the UI
    this.updateServerStatus(serverId, 'error', error.message);
  }

  /**
   * Handle MCP tool execution errors
   */
  static handleToolExecutionError(
    error: MCPToolExecutionError,
    toolName: string,
    serverName: string,
  ): void {
    const errorCode = this.getErrorCode(error);
    const userMessage = `Tool "${toolName}" failed on ${serverName}: ${this.getToolErrorMessage(errorCode)}`;
    
    console.error(`MCP Tool Execution Error [${toolName}]:`, error);

    // Show user notification for non-transient errors
    if (!this.isTransientError(errorCode)) {
      toast(userMessage, { type: 'error' });
    }
  }

  /**
   * Handle MCP timeout errors
   */
  static handleTimeoutError(
    error: MCPTimeoutError,
    context: string,
  ): void {
    const userMessage = `Operation timed out: ${context}`;
    
    console.error(`MCP Timeout Error:`, error);
    toast(userMessage, { type: 'warning' });
  }

  /**
   * Handle general MCP errors
   */
  static handleGeneralError(
    error: MCPError | Error,
    context?: string,
  ): void {
    const userMessage = context 
      ? `MCP Error in ${context}: ${error.message}`
      : `MCP Error: ${error.message}`;
    
    console.error(`MCP General Error:`, error);
    toast(userMessage, { type: 'error' });
  }

  /**
   * Get error code from error message/type
   */
  private static getErrorCode(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'CONNECTION_TIMEOUT';
    if (message.includes('refused') || message.includes('econnrefused')) return 'CONNECTION_REFUSED';
    if (message.includes('auth')) return 'AUTHENTICATION_FAILED';
    if (message.includes('permission')) return 'PERMISSION_DENIED';
    if (message.includes('rate limit')) return 'RATE_LIMITED';
    if (message.includes('not found')) return 'TOOL_NOT_FOUND';
    if (message.includes('invalid')) return 'INVALID_ARGUMENTS';
    if (message.includes('network')) return 'NETWORK_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(errorCode: string, serverName: string): string {
    const baseMessage = this.ERROR_MESSAGES[errorCode as keyof typeof this.ERROR_MESSAGES] 
      || this.ERROR_MESSAGES.UNKNOWN_ERROR;
    
    return `${baseMessage}: ${serverName}`;
  }

  /**
   * Get tool-specific error message
   */
  private static getToolErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'TOOL_NOT_FOUND':
        return 'Tool not available on this server';
      case 'INVALID_ARGUMENTS':
        return 'Invalid parameters provided';
      case 'PERMISSION_DENIED':
        return 'Insufficient permissions';
      case 'TOOL_TIMEOUT':
        return 'Operation took too long';
      default:
        return 'Execution failed';
    }
  }

  /**
   * Determine if error should trigger retry
   */
  private static shouldRetry(errorCode: string): boolean {
    const retryableErrors = [
      'CONNECTION_TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'RATE_LIMITED',
    ];
    
    return retryableErrors.includes(errorCode);
  }

  /**
   * Determine if error is transient (temporary)
   */
  private static isTransientError(errorCode: string): boolean {
    const transientErrors = [
      'CONNECTION_TIMEOUT',
      'NETWORK_ERROR',
      'RATE_LIMITED',
    ];
    
    return transientErrors.includes(errorCode);
  }

  /**
   * Get retry delay with exponential backoff
   */
  private static getRetryDelay(retryCount: number): number {
    return this.RETRY_DELAYS[Math.min(retryCount, this.RETRY_DELAYS.length - 1)];
  }

  /**
   * Update server status in the UI
   */
  private static updateServerStatus(
    serverId: string,
    status: 'error' | 'disconnected',
    error?: string,
  ): void {
    // Emit custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('mcp-server-status-changed', {
      detail: { serverId, status, error },
    }));
  }

  /**
   * Create error boundary for MCP operations
   */
  static withErrorBoundary<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T,
  ): Promise<T | undefined> {
    return operation().catch((error) => {
      this.handleGeneralError(error, context);
      return fallbackValue;
    });
  }

  /**
   * Create retry wrapper for MCP operations
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context?: string,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, this.getRetryDelay(attempt))
        );
        
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} for ${context}:`, error);
      }
    }
    
    throw lastError!;
  }

  /**
   * Get error reporting data for telemetry
   */
  static getErrorReportingData(error: Error): Record<string, any> {
    return {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorCode: this.getErrorCode(error),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }
}