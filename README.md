# jiracli-mcp

Universal JIRA MCP Server with multi-project integration, sprint insights, and comprehensive project analytics via jiracli.

## Quick Start

1. **Start the server:**
   ```bash
   cd /Users/vanhoof/scratch/jiracli-mcp
   ./start-server.sh
   ```

2. **Configure Claude Desktop:**
   - Copy contents of `claude-config.json` to your Claude Desktop MCP settings
   - Restart Claude Desktop

3. **Ask natural language questions:**
   - "What are the latest NSTL issues?"
   - "Show me sprint insights for [BoardName]"
   - "List all available boards"
   - "Get board sprints for [BoardName]"
   - "Analyze [ISSUE-123] for duplicates"

## 🚀 New Sprint Features

### `list_boards`
List all available JIRA boards
**Example:** "What boards are available?"

### `get_board_sprints`
Get sprints for a specific board with filtering
**Example:** "Show me sprints for the DevOps board"

### `get_sprint_insights`
Comprehensive sprint analysis with progress metrics
**Example:** "Give me insights on the current sprint"

## 📊 Enhanced Tools

### `get_latest_issues`
Get recent issues (now supports any project)
**Example:** "Get the latest 10 issues from PROJ"

### `search_issues`
Search across projects with JQL or keywords
**Example:** "Search for 'authentication' issues"

### `get_issue_details`
Full issue details for any project
**Example:** "Show me PROJ-456 details"

### `analyze_duplicates`
Smart duplicate detection with cross-project support
**Example:** "Check if ISSUE-123 is a duplicate"

### `get_component_experts`
Find experts for components across projects
**Example:** "Who are the experts for component X?"

### `get_triage_summary`
Comprehensive triage analysis
**Example:** "Triage ISSUE-123 for me"

## Configuration

- **Default Project:** NSTL
- **Working Directory:** /Users/vanhoof/scratch/jiracli
- **Python Virtual Environment:** /Users/vanhoof/scratch/jiracli/venv
- **Server Script:** /Users/vanhoof/scratch/jiracli-mcp/server.js

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
   - Verify jiracli at /Users/vanhoof/scratch/jiracli
   - Check file permissions

2. **jiracli commands fail:**
   - Ensure `.jira.yml` is configured
   - Test: `source /Users/vanhoof/scratch/jiracli/venv/bin/activate && jcli --version`

3. **MCP connection issues:**
   - Verify Claude Desktop MCP configuration
   - Check server logs for errors
   - Restart both server and Claude Desktop

## Environment Variables

Customize via `.env` file:
- `JIRA_DEFAULT_PROJECT`: Default project key
- `JCLI_VENV_PATH`: Path to jiracli virtual environment
- `JCLI_WORKING_DIR`: jiracli working directory

Your JIRA workflow is now AI-powered with sprint insights! 🚀
