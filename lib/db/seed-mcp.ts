import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { mcpServer } from './schema';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const sampleMCPServers = [
  {
    name: 'Notion API',
    description:
      'Access and manage your Notion workspace - create pages, update databases, and search content.',
    iconUrl: 'https://www.notion.so/images/favicon.ico',
    transportType: 'stdio_proxy' as const,
    transportConfig: {
      type: 'stdio_proxy',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      requiresApiKey: true,
      authType: 'bearer',
      envHeaders: true, // Indicates this server uses environment headers
    },
    schemaConfig: {
      credentialFields: [
        {
          name: 'apiKey',
          label: 'Notion API Key',
          type: 'password',
          required: true,
          description: 'Your Notion integration API key (starts with ntn_)',
          placeholder: 'ntn_****',
        },
      ],
    },
    isCurated: true,
    isPublic: true,
  },
  {
    name: 'GitHub API',
    description:
      'Interact with GitHub repositories, issues, pull requests, and more.',
    iconUrl: 'https://github.com/favicon.ico',
    transportType: 'sse' as const,
    transportConfig: {
      type: 'sse',
      url: 'https://api.github.com/mcp',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    },
    isCurated: true,
    isPublic: true,
  },
  {
    name: 'Weather API',
    description:
      'Get current weather conditions and forecasts for any location.',
    iconUrl: 'https://openweathermap.org/img/w/01d.png',
    transportType: 'sse' as const,
    transportConfig: {
      type: 'sse',
      url: 'https://api.openweathermap.org/mcp',
    },
    isCurated: true,
    isPublic: true,
  },
  {
    name: 'Slack Integration',
    description:
      'Send messages, create channels, and manage your Slack workspace.',
    iconUrl: 'https://slack.com/favicon.ico',
    transportType: 'sse' as const,
    transportConfig: {
      type: 'sse',
      url: 'https://slack.com/api/mcp',
    },
    isCurated: true,
    isPublic: true,
  },
  {
    name: 'Google Calendar',
    description:
      'Manage your calendar events, create meetings, and check availability.',
    iconUrl: 'https://calendar.google.com/favicon.ico',
    transportType: 'sse' as const,
    transportConfig: {
      type: 'sse',
      url: 'https://www.googleapis.com/calendar/v3/mcp',
    },
    isCurated: true,
    isPublic: true,
  },
];

async function seedMCPServers() {
  try {
    console.log('🌱 Seeding MCP servers...');

    for (const server of sampleMCPServers) {
      const [inserted] = await db.insert(mcpServer).values(server).returning();

      console.log(`✅ Created MCP server: ${inserted.name} (${inserted.id})`);
    }

    console.log('🎉 MCP servers seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding MCP servers:', error);
  } finally {
    await client.end();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedMCPServers();
}

export { seedMCPServers };
