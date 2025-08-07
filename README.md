# jiracli-mcp

Universal JIRA MCP Server with multi-project integration, sprint insights, and comprehensive project analytics via jiracli.

## ✨ Key Features

- **🏃‍♂️ Sprint Insights**: Progress tracking, velocity analysis, assignee workload
- **📊 Multi-Project Support**: Configurable defaults with per-query overrides
- **🔍 Smart Analytics**: Duplicate detection, component experts, triage assistance
- **🎯 Board Management**: List boards, analyze sprints, track completion

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** installed
- **jiracli installed and configured** with JIRA access
- **Claude Desktop** or MCP-compatible client

### Setup Steps

1. **Install & Configure:**
   ```bash
   ./install.sh
   ```
   *You will be prompted to provide:*
   - Your default JIRA project key (e.g., FDP, PROJ)
   - Full path to your jiracli installation directory

2. **Start the server:**
   ```bash
   ./start-server.sh
   ```

3. **Configure Claude Desktop:**
   - Copy contents of generated `claude-config.json` to Claude Desktop MCP settings
   - Restart Claude Desktop

**⚠️ Important**: This server requires explicit configuration - no default paths are assumed!

## 🗣️ Example Queries

### Sprint & Board Management
- *"What boards are available?"*
- *"Show me sprints for the DevOps board"*
- *"Give me insights on the current sprint with progress analysis"*
- *"What's the completion percentage and velocity in the active sprint?"*

### Multi-Project Analytics  
- *"What are the latest FDP issues?"*
- *"Get the 10 most recent issues from PROJECT2"*
- *"Search for authentication issues across all projects"*
- *"Find experts for networking components in PROJ3"*

### Enhanced Issue Management
- *"Show me details for PROJ-456"*
- *"Is ISSUE-123 a duplicate across projects?"*
- *"Give me a comprehensive triage summary for FDP-1510"*

## 🛠️ Available Tools

### 🆕 Sprint & Board Tools

| Tool | Description | Example |
|------|-------------|---------|
| `list_boards` | List all JIRA boards | *"What boards exist?"* |
| `get_board_sprints` | Get sprints with filtering options | *"Show DevOps board sprints"* |
| `get_sprint_insights` | Comprehensive sprint analysis | *"Analyze current sprint progress"* |

### 📈 Enhanced Multi-Project Tools

| Tool | Multi-Project | Description | Example |
|------|---------------|-------------|---------|
| `get_latest_issues` | ✅ | Get recent issues by project | *"Latest from PROJ2"* |
| `search_issues` | ✅ | Cross-project search with JQL/keywords | *"Search auth in PROJECT3"* |
| `get_issue_details` | ✅ | Full details for any project issue | *"Show PROJ-456"* |
| `analyze_duplicates` | ✅ | Cross-project duplicate detection | *"Check ISSUE-123 duplicates"* |
| `get_component_experts` | ✅ | Per-project component experts | *"PROJ4 networking experts"* |
| `get_triage_summary` | ✅ | Universal triage analysis | *"Triage any issue"* |

## 🏃‍♂️ Sprint Insights Features

### Progress Tracking
- **Completion Percentages**: Automatic calculation based on done vs. total issues
- **Velocity Indicators**: Done, in-progress, and todo issue counts
- **Status Breakdown**: Issues organized by board columns

### Assignee Analysis
- **Workload Distribution**: Issues per assignee with completion rates
- **Unassigned Tracking**: Count and identification of unassigned work
- **Expert Recommendations**: Historical assignment patterns

### Active Sprint Detection
- Automatically focuses on active sprints when no specific sprint requested
- Supports filtering by sprint name, state, or date range
- Includes/excludes closed sprints based on requirements

## 🔧 Configuration

### Environment Variables
```bash
JIRA_DEFAULT_PROJECT=FDP              # Your primary project
JCLI_VENV_PATH=/path/to/jiracli/venv   # jiracli virtual environment
JCLI_WORKING_DIR=/path/to/jiracli      # jiracli working directory
```

### Multi-Project Usage Patterns
- **Default Project**: Uses configured default when no project specified
- **Per-Query Override**: *"Get latest issues from PROJECT2"*
- **Cross-Project Search**: *"Search 'security' across all projects"*

## 📋 Installation Requirements

- **Node.js 18+**
- **jiracli installed and configured** with JIRA access and `.jira.yml` config
- **Claude Desktop** or MCP-compatible client
- **Full paths to your jiracli installation** (no assumptions made)

## 🎪 Demo Workflow

Try this comprehensive sequence:

1. **"What boards are available?"** → *Discover your boards*
2. **"Show me sprints for [board name]"** → *See sprint structure*  
3. **"Give me insights on the active sprint"** → *Detailed analysis*
4. **"What are the latest issues from [project]?"** → *Recent work*
5. **"Analyze [issue key] for duplicates"** → *Smart detection*
6. **"Who are experts for [component]?"** → *Assignment guidance*

## 🚨 Troubleshooting

### Sprint Data Issues
```bash
# Test board access
source /path/to/jiracli/venv/bin/activate
jcli boards list
jcli boards sprints "BoardName" --json
```

### Multi-Project Access  
```bash
# Verify project permissions
jcli issues list --jql "project = OTHERPROJECT" --max-issues 1
```

### Server Configuration
1. Check `.env` file has correct jiracli paths
2. Test jiracli: `source venv/bin/activate && jcli --version`
3. Ensure Claude Desktop restarted after config changes

## 📁 File Structure

```
jiracli-mcp/
├── server.js                 # Enhanced MCP server
├── package.json              # Node.js dependencies
├── install.sh                # Interactive installer
├── start-server.sh           # Server startup
├── claude-config.json        # Generated MCP config
├── config.example.json       # Template for others
├── .env                      # Environment config
├── quick-start.md           # Quick start guide
└── SETUP_GUIDE.md           # Complete setup guide
```

## 🎯 For Other Users

To set up on a different system:

1. **Clone this repository** to your target location
2. **Ensure jiracli is installed** and working on your system
3. **Run `./install.sh`** and provide your specific paths:
   - Your JIRA project key
   - Full path to your jiracli directory
4. **Follow the generated instructions** for Claude Desktop setup

**Note**: The installer validates all paths and tests jiracli before proceeding.

## 🎉 What's New in v2.0

- ✅ **Multi-Project Support** - Work with any JIRA project
- ✅ **Sprint Insights** - Comprehensive sprint analysis  
- ✅ **Board Management** - List and analyze boards
- ✅ **Progress Tracking** - Velocity and completion metrics
- ✅ **Portable Configuration** - Easy setup for any environment
- ✅ **Cross-Project Analytics** - Search and analyze across projects

---

Your JIRA workflow is now AI-powered with comprehensive sprint insights! 🚀