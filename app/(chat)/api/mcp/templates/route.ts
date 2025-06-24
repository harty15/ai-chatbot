import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { MCP_SERVER_TEMPLATES } from '@/lib/ai/mcp-types';

export const maxDuration = 10;

/**
 * GET /api/mcp/templates
 * Get available MCP server templates
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:mcp').toResponse();
  }

  try {
    // Group templates by category
    const templatesByCategory = MCP_SERVER_TEMPLATES.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, typeof MCP_SERVER_TEMPLATES>);

    return Response.json({
      templates: MCP_SERVER_TEMPLATES,
      categories: templatesByCategory,
      totalTemplates: MCP_SERVER_TEMPLATES.length,
    });
  } catch (error) {
    console.error('Error getting MCP templates:', error);
    return new ChatSDKError('internal:mcp', 'Failed to get templates').toResponse();
  }
}