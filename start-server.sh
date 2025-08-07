#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load and export environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    # Load variables and export them for child processes
    set -a  # automatically export all variables
    source "$SCRIPT_DIR/.env"
    set +a  # turn off automatic export
fi

# Start the MCP server
cd "$SCRIPT_DIR"
echo "Starting jiracli-mcp server..."
echo "Working directory: $JCLI_WORKING_DIR"
echo "Python venv: $JCLI_VENV_PATH"
echo ""

node server.js
