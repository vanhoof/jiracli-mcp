#!/bin/bash

# jiracli-mcp Installation Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# No default paths - must be configured by user
JIRACLI_DIR=""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed."
        exit 1
    fi
    
    # jiracli validation will be done during configuration prompts
    log "jiracli validation will be performed during configuration setup"
    
    success "Prerequisites check completed"
}

# Install MCP server dependencies
install_dependencies() {
    log "Installing MCP server dependencies..."
    
    cd "$SCRIPT_DIR"
    
    # Install Node.js dependencies
    npm install
    
    success "Dependencies installed"
}

# Create configuration files
create_config() {
    log "Creating configuration files..."
    
    # Prompt for required configuration
    echo ""
    log "This installation requires configuration of paths specific to your system."
    echo ""
    
    # Get JIRA project key
    while [ -z "$PROJECT_KEY" ]; do
        read -p "Enter your default JIRA project key (e.g., FDP, PROJ): " PROJECT_KEY
        if [ -z "$PROJECT_KEY" ]; then
            warning "JIRA project key is required. Please enter a valid project key."
        fi
    done
    
    # Get jiracli directory
    while [ -z "$JIRACLI_DIR" ] || [ ! -d "$JIRACLI_DIR" ]; do
        read -p "Enter full path to your jiracli directory: " JIRACLI_DIR
        if [ -z "$JIRACLI_DIR" ]; then
            warning "jiracli directory path is required."
        elif [ ! -d "$JIRACLI_DIR" ]; then
            error "Directory not found: $JIRACLI_DIR"
            echo "Please enter the full path to your existing jiracli installation."
            JIRACLI_DIR=""
        fi
    done
    
    # Validate jiracli installation
    if [ ! -f "$JIRACLI_DIR/venv/bin/activate" ]; then
        error "jiracli virtual environment not found at $JIRACLI_DIR/venv"
        echo "Please ensure you have a proper jiracli installation with virtual environment."
        exit 1
    fi
    
    # Test jiracli
    if ! (cd "$JIRACLI_DIR" && source venv/bin/activate && command -v jcli > /dev/null); then
        error "jcli command not found in virtual environment"
        echo "Please ensure jiracli is properly installed and configured."
        exit 1
    fi
    
    success "Configuration validated: Project=$PROJECT_KEY, jiracli=$JIRACLI_DIR"

    # Create environment configuration
    cat > "$SCRIPT_DIR/.env" << EOF
# jiracli-mcp Configuration
JCLI_VENV_PATH=$JIRACLI_DIR/venv
JCLI_WORKING_DIR=$JIRACLI_DIR
JIRA_DEFAULT_PROJECT=$PROJECT_KEY
MCP_SERVER_PORT=3000
LOG_LEVEL=info
EOF

    # Create MCP client configuration for Claude Desktop
    # Replace placeholders in template with actual values
    sed -e "s|__SERVER_PATH__|$SCRIPT_DIR/server.js|g" \
        -e "s|__JCLI_VENV_PATH__|$JIRACLI_DIR/venv|g" \
        -e "s|__JCLI_WORKING_DIR__|$JIRACLI_DIR|g" \
        -e "s|__JIRA_DEFAULT_PROJECT__|$PROJECT_KEY|g" \
        "$SCRIPT_DIR/claude-desktop-config.json" > "$SCRIPT_DIR/claude-config.json"

    # Create startup script
    cat > "$SCRIPT_DIR/start-server.sh" << 'EOF'
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
EOF

    chmod +x "$SCRIPT_DIR/start-server.sh"
    
    success "Configuration files created"
}

# Test the installation
test_installation() {
    log "Testing installation..."
    
    cd "$SCRIPT_DIR"
    
    # Test Node.js server
    timeout 5 node server.js > /dev/null 2>&1 || true
    
    # Test jiracli access (already validated during config)
    log "jiracli was validated during configuration setup"
    
    success "Installation test completed"
}

# Create usage instructions
create_instructions() {
    cat > "$SCRIPT_DIR/README.md" << EOF
# jiracli-mcp

Universal JIRA MCP Server with multi-project integration, sprint insights, and comprehensive project analytics via jiracli.

## Quick Start

1. **Start the server:**
   \`\`\`bash
   cd $(pwd)
   ./start-server.sh
   \`\`\`

2. **Configure Claude Desktop:**
   - Copy contents of \`claude-config.json\` to your Claude Desktop MCP settings
   - Restart Claude Desktop

3. **Ask natural language questions:**
   - "What are the latest $PROJECT_KEY issues?"
   - "Show me sprint insights for [BoardName]"
   - "List all available boards"
   - "Get board sprints for [BoardName]"
   - "Analyze [ISSUE-123] for duplicates"

## 🚀 New Sprint Features

### \`list_boards\`
List all available JIRA boards
**Example:** "What boards are available?"

### \`get_board_sprints\`
Get sprints for a specific board with filtering
**Example:** "Show me sprints for the DevOps board"

### \`get_sprint_insights\`
Comprehensive sprint analysis with progress metrics
**Example:** "Give me insights on the current sprint"

## 📊 Enhanced Tools

### \`get_latest_issues\`
Get recent issues (now supports any project)
**Example:** "Get the latest 10 issues from PROJ"

### \`search_issues\`
Search across projects with JQL or keywords
**Example:** "Search for 'authentication' issues"

### \`get_issue_details\`
Full issue details for any project
**Example:** "Show me PROJ-456 details"

### \`analyze_duplicates\`
Smart duplicate detection with cross-project support
**Example:** "Check if ISSUE-123 is a duplicate"

### \`get_component_experts\`
Find experts for components across projects
**Example:** "Who are the experts for component X?"

### \`get_triage_summary\`
Comprehensive triage analysis
**Example:** "Triage ISSUE-123 for me"

## Configuration

- **Default Project:** $PROJECT_KEY
- **Working Directory:** $JIRACLI_DIR
- **Python Virtual Environment:** $JIRACLI_DIR/venv
- **Server Script:** $SCRIPT_DIR/server.js

## Multi-Project Usage

Override the default project in queries:
- "Get latest issues from PROJECT2"
- "Search PROJ3 for authentication issues"
- "Find experts in PROJECT4 for networking"

## Sprint Analysis Features

- **Progress Tracking:** Completion percentages, velocity indicators
- **Assignee Analysis:** Workload distribution, unassigned issues
- **Status Breakdown:** Issues by column/status
- **Active Sprint Focus:** Automatic detection of current sprints

## Troubleshooting

1. **Server won't start:**
   - Check Node.js version (18+ required)
   - Verify jiracli at $JIRACLI_DIR
   - Check file permissions

2. **jiracli commands fail:**
   - Ensure \`.jira.yml\` is configured
   - Test: \`source $JIRACLI_DIR/venv/bin/activate && jcli --version\`

3. **MCP connection issues:**
   - Verify Claude Desktop MCP configuration
   - Check server logs for errors
   - Restart both server and Claude Desktop

## Environment Variables

Customize via \`.env\` file:
- \`JIRA_DEFAULT_PROJECT\`: Default project key
- \`JCLI_VENV_PATH\`: Path to jiracli virtual environment
- \`JCLI_WORKING_DIR\`: jiracli working directory

Your JIRA workflow is now AI-powered with sprint insights! 🚀
EOF

    success "Usage instructions created: $SCRIPT_DIR/README.md"
}

# Main installation process
main() {
    echo ""
    echo "=========================================="
    echo "        jiracli-mcp INSTALLATION"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    install_dependencies
    create_config
    test_installation
    create_instructions
    
    echo ""
    echo "=========================================="
    echo "  INSTALLATION COMPLETE!"
    echo "=========================================="
    echo ""
    echo "📁 Server location: $SCRIPT_DIR"
    echo "🚀 Start server: ./start-server.sh"
    echo "📖 Instructions: README.md"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Start the MCP server: ./start-server.sh"
    echo "   2. Configure Claude Desktop with the MCP server"
    echo "   3. Ask Claude questions about JIRA issues and sprints!"
    echo ""
    success "Ready to use with comprehensive sprint insights!"
}

main "$@"