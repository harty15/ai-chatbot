#!/usr/bin/env node

/**
 * MCP Connection Diagnostic Script
 * Tests connectivity to MCP servers and provides detailed error information
 */

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

// MCP servers from your dashboard
const servers = [
  {
    name: 'Sante-Utils',
    url: 'https://utils.sante-automation.com/mcp',
    type: 'sse',
  },
  {
    name: 'Deal Cloud',
    url: 'https://deal-cloud.sante-automation.com/mcp',
    type: 'sse',
  },
];

/**
 * Test basic HTTP connectivity
 */
async function testHTTPConnectivity(serverUrl, serverName) {
  console.log(`\n🔍 Testing HTTP connectivity for ${serverName}...`);

  try {
    const url = new URL(serverUrl);
    const isHTTPS = url.protocol === 'https:';
    console.log(`   - Protocol: ${url.protocol}`);
    console.log(`   - Host: ${url.host}`);
    console.log(`   - Path: ${url.pathname}`);

    return new Promise((resolve, reject) => {
      const client = isHTTPS ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (isHTTPS ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'MCP-Diagnostic-Tool/1.0',
          Accept: 'text/event-stream,application/json,*/*',
        },
      };

      const req = client.request(options, (res) => {
        console.log(
          `   ✅ HTTP Response: ${res.statusCode} ${res.statusMessage}`,
        );
        console.log(
          `   - Content-Type: ${res.headers['content-type'] || 'Not specified'}`,
        );
        console.log(`   - Server: ${res.headers['server'] || 'Not specified'}`);

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > 1000) {
            res.destroy(); // Prevent large downloads
          }
        });

        res.on('end', () => {
          if (data.length > 0) {
            console.log(
              `   - Response preview: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`,
            );
          }
          resolve({
            success: true,
            status: res.statusCode,
            headers: res.headers,
            preview: data.substring(0, 500),
          });
        });
      });

      req.on('error', (error) => {
        console.log(`   ❌ Connection failed: ${error.message}`);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        const timeoutError = new Error('Request timeout after 10 seconds');
        console.log(`   ❌ ${timeoutError.message}`);
        reject(timeoutError);
      });

      req.end();
    });
  } catch (error) {
    console.log(`   ❌ URL parsing error: ${error.message}`);
    throw error;
  }
}

/**
 * Test DNS resolution
 */
async function testDNSResolution(serverUrl, serverName) {
  console.log(`\n🔍 Testing DNS resolution for ${serverName}...`);

  try {
    const url = new URL(serverUrl);
    const dns = require('node:dns').promises;

    const addresses = await dns.lookup(url.hostname);
    console.log(
      `   ✅ DNS resolved: ${url.hostname} -> ${addresses.address} (${addresses.family === 4 ? 'IPv4' : 'IPv6'})`,
    );
    return addresses;
  } catch (error) {
    console.log(`   ❌ DNS resolution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test SSE endpoint specifically
 */
async function testSSEEndpoint(serverUrl, serverName) {
  console.log(`\n🔍 Testing SSE endpoint for ${serverName}...`);

  try {
    const url = new URL(serverUrl);
    const isHTTPS = url.protocol === 'https:';

    return new Promise((resolve, reject) => {
      const client = isHTTPS ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (isHTTPS ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        timeout: 15000,
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      };

      const req = client.request(options, (res) => {
        console.log(
          `   - SSE Response: ${res.statusCode} ${res.statusMessage}`,
        );
        console.log(
          `   - Content-Type: ${res.headers['content-type'] || 'Not specified'}`,
        );

        if (
          res.statusCode === 200 &&
          res.headers['content-type']?.includes('text/event-stream')
        ) {
          console.log(`   ✅ SSE endpoint is responding correctly`);

          let eventCount = 0;
          res.on('data', (chunk) => {
            eventCount++;
            if (eventCount <= 3) {
              console.log(
                `   - Event ${eventCount}: ${chunk.toString().substring(0, 100)}...`,
              );
            }

            if (eventCount >= 5) {
              res.destroy();
              resolve({ success: true, eventCount });
            }
          });

          setTimeout(() => {
            res.destroy();
            resolve({ success: true, eventCount, timeout: true });
          }, 5000);
        } else {
          console.log(`   ⚠️  Unexpected response for SSE endpoint`);
          resolve({
            success: false,
            status: res.statusCode,
            contentType: res.headers['content-type'],
          });
        }
      });

      req.on('error', (error) => {
        console.log(`   ❌ SSE connection failed: ${error.message}`);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        console.log(`   ❌ SSE request timeout`);
        reject(new Error('SSE request timeout'));
      });

      req.end();
    });
  } catch (error) {
    console.log(`   ❌ SSE test error: ${error.message}`);
    throw error;
  }
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
  console.log('🚀 MCP Server Connection Diagnostics');
  console.log('=====================================');
  console.log(`Testing ${servers.length} server(s)...\n`);

  const results = [];

  for (const server of servers) {
    console.log(`\n📋 Testing: ${server.name}`);
    console.log('─'.repeat(50));

    const serverResult = {
      name: server.name,
      url: server.url,
      tests: {},
    };

    try {
      // Test DNS resolution
      serverResult.tests.dns = await testDNSResolution(server.url, server.name);

      // Test HTTP connectivity
      serverResult.tests.http = await testHTTPConnectivity(
        server.url,
        server.name,
      );

      // Test SSE endpoint if HTTP worked
      if (serverResult.tests.http.success) {
        serverResult.tests.sse = await testSSEEndpoint(server.url, server.name);
      }

      serverResult.success = true;
    } catch (error) {
      serverResult.success = false;
      serverResult.error = error.message;
      console.log(`   ❌ Overall test failed: ${error.message}`);
    }

    results.push(serverResult);
  }

  // Summary
  console.log('\n\n📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));

  results.forEach((result) => {
    console.log(`\n${result.success ? '✅' : '❌'} ${result.name}:`);
    console.log(`   URL: ${result.url}`);

    if (result.success) {
      console.log(`   - DNS: ✅ Resolved`);
      console.log(
        `   - HTTP: ✅ Status ${result.tests.http?.status || 'Unknown'}`,
      );
      console.log(
        `   - SSE: ${result.tests.sse?.success ? '✅ Working' : '❌ Failed'}`,
      );
    } else {
      console.log(`   - Error: ${result.error}`);
    }
  });

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('─'.repeat(50));

  const failedServers = results.filter((r) => !r.success);
  if (failedServers.length === 0) {
    console.log(
      '✅ All servers are reachable! The issue may be with MCP protocol specifics.',
    );
    console.log('   - Check server authentication requirements');
    console.log('   - Verify MCP protocol implementation');
    console.log('   - Check server logs for detailed error messages');
  } else {
    console.log('❌ Some servers are not reachable:');
    failedServers.forEach((server) => {
      console.log(`   - ${server.name}: ${server.error}`);
    });
    console.log('\n   Possible solutions:');
    console.log('   1. Check if the servers are running and accessible');
    console.log('   2. Verify firewall and network connectivity');
    console.log('   3. Confirm the URLs are correct');
    console.log('   4. Check if servers require authentication');
  }

  console.log('\n🔧 Next steps:');
  console.log('   - Run this script periodically to monitor connectivity');
  console.log('   - Check your application logs for detailed MCP errors');
  console.log(
    '   - Consider implementing retry logic with exponential backoff',
  );
}

// Run diagnostics
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = {
  runDiagnostics,
  testHTTPConnectivity,
  testDNSResolution,
  testSSEEndpoint,
};
