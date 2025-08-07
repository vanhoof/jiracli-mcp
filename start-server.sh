#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
fi

# Start the MCP server
cd "$SCRIPT_DIR"
echo "Starting jiracli-mcp server..."
echo "Working directory: $JCLI_WORKING_DIR"
echo "Python venv: $JCLI_VENV_PATH"
echo ""

node server.js
