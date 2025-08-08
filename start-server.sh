#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables and export them for child processes
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a  # automatically export all variables
    source "$SCRIPT_DIR/.env"
    set +a  # turn off automatic export

    # Explicitly export key variables for Node.js
    export JIRA_DEFAULT_PROJECT
    export JCLI_USE_GLOBAL
    export JCLI_VENV_PATH
    export JCLI_WORKING_DIR
    export JIRA_BOARDS
fi

# Start the MCP server
cd "$SCRIPT_DIR"
echo "Starting jiracli-mcp server..."
echo "Installation type: $([ "$JCLI_USE_GLOBAL" = "true" ] && echo "Global jcli" || echo "Virtual environment")"
echo "Working directory: ${JCLI_WORKING_DIR:-"Current directory"}"
if [ "$JCLI_USE_GLOBAL" != "true" ]; then
    echo "Python venv: $JCLI_VENV_PATH"
fi
echo ""

node server.js
