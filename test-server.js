#!/usr/bin/env node

/**
 * Quick test script for the FDP JIRA MCP Server
 * This simulates MCP Super Assistant calling the server
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testServer() {
  console.log('🧪 Testing FDP JIRA MCP Server...\n');
  
  try {
    // Test the server by sending a simulated MCP request
    const testInput = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    });
    
    console.log('📡 Sending tools/list request...');
    
    // Use echo to pipe the test input to the server
    const { stdout } = await execAsync(`echo '${testInput}' | node server.js`, {
      cwd: '/Users/vanhoof/scratch/jiracli-ai-mcp/mcp_server'
    });
    
    console.log('✅ Server response:');
    console.log(stdout);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServer();