# jiracli-mcp

Universal JIRA MCP Server providing comprehensive multi-project integration, sprint insights, and project analytics via jiracli.

## ✨ What This Does

This MCP server creates a powerful bridge between Claude and your JIRA instance, enabling:

- **🏃‍♂️ Sprint Insights**: Progress tracking, velocity analysis, assignee workload distribution
- **📊 Multi-Project Support**: Work across multiple JIRA projects with configurable defaults
- **🔍 Smart Analytics**: Duplicate detection, component experts, comprehensive triage assistance
- **🎯 Board Management**: List boards, analyze sprints, track completion metrics
- **🤖 Natural Language Interface**: Ask questions in plain English, get structured insights

## 🚀 Quick Setup

### Prerequisites
- **Node.js 18+** installed
- **jiracli installed and configured** with JIRA access and `.jira.yml` config
- **Claude Desktop** or MCP-compatible client

### Installation Steps

#### 1. Install & Configure
```bash
cd /path/to/your/jiracli-mcp
./install.sh
```

**The installer will prompt you for:**
- **Default JIRA project key** (e.g., FDP, PROJ, DEV)
- **Full path to jiracli directory** (must be an existing, working jiracli installation)

**⚠️ Important**: The installer validates your jiracli installation and will not proceed without a working setup.

#### 2. Start the Server
```bash
./start-server.sh
```
**⚠️ Important**: Keep this terminal open - the server needs to stay running.

#### 3. Configure Claude Desktop

1. **Copy the contents** of the generated `claude-config.json`
2. **Paste into Claude Desktop MCP settings:**
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. **Restart Claude Desktop** completely

**Example Configuration:**
```json
{
  "mcpServers": {
    "jiracli-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/jiracli-mcp/server.js"],
      "env": {
        "JCLI_VENV_PATH": "/absolute/path/to/jiracli/venv",
        "JCLI_WORKING_DIR": "/absolute/path/to/jiracli",
        "JIRA_DEFAULT_PROJECT": "YOUR_PROJECT"
      }
    }
  }
}
```

#### 4. Test the Integration

**Sprint Features Test:**
- *"What boards are available?"*
- *"Show me sprints for [pick a board name]"*
- *"Give me insights on the active sprint"*

**Multi-Project Test:**
- *"What are the latest issues from [your default project]?"*
- *"Get 5 recent issues from [another project]"*
- *"Search for 'bug' across all my projects"*

## 🗣️ Example Questions

### 🏃‍♂️ Sprint & Board Management
- *"What boards are available in my JIRA instance?"*
- *"Show me all sprints for the DevOps board"*
- *"Give me insights on the current sprint with progress analysis"*
- *"What's the completion percentage and velocity in the active sprint?"*
- *"Show me sprint velocity and completion rates"*

### 📊 Multi-Project Analytics  
- *"What are the latest FDP issues?"*
- *"Get the 10 most recent issues from PROJECT2"*
- *"Search for authentication issues across all projects"*
- *"Find experts for networking components in PROJ3"*

### 🔍 Issue Management
- *"Show me details for PROJ-456"*
- *"Is ISSUE-123 a duplicate across projects?"*
- *"Who are the experts for networking components?"*
- *"Give me a comprehensive triage summary for FDP-1510"*

### 🎯 Cross-Project Queries
- *"Search PROJECT3 for 'certificate' issues"*
- *"Find experts in PROJECT4 for API components"*
- *"Get latest issues from PROJ but limit to 5"*

## 🛠️ Available Tools

### 🆕 Sprint & Board Management

| Function | What It Does | Example Question |
|----------|-------------|------------------|
| **list_boards** | Lists all JIRA boards | *"What boards exist?"* |
| **get_board_sprints** | Sprint list with filtering | *"Show DevOps board sprints"* |
| **get_sprint_insights** | Deep sprint analysis | *"Analyze current sprint progress"* |

#### Sprint Insights Features
- **Progress Tracking**: Completion percentages, velocity indicators
- **Assignee Analysis**: Workload distribution, unassigned issues
- **Status Breakdown**: Issues by column/status with smart categorization
- **Active Sprint Detection**: Automatically focuses on current sprints

### 📈 Enhanced Multi-Project Tools

| Function | Multi-Project Support | Description | Example |
|----------|---------------------|-------------|---------|
| **get_latest_issues** | ✅ | Get recent issues by project | *"Latest issues from PROJ2"* |
| **search_issues** | ✅ | Cross-project search with JQL/keywords | *"Search auth in PROJECT3"* |
| **get_issue_details** | ✅ | Full details for any project issue | *"Show PROJ-456"* |
| **analyze_duplicates** | ✅ | Cross-project duplicate detection | *"Check ISSUE-123 duplicates"* |
| **get_component_experts** | ✅ | Per-project component experts | *"PROJ4 networking experts"* |
| **get_triage_summary** | ✅ | Universal triage analysis | *"Triage any issue"* |

## 🎪 Demo Workflow

Try this comprehensive sequence:

1. **Discovery**: *"What boards are available in JIRA?"*
2. **Sprint Overview**: *"Show me sprints for [board name]"*
3. **Deep Analysis**: *"Give me insights on the current sprint for [board]"*
4. **Issue Analysis**: *"What are the latest 5 issues from [project]?"*
5. **Smart Detection**: *"Analyze [issue key] for potential duplicates"*
6. **Expertise**: *"Who are experts for [component name]?"*

## 🔧 Configuration

### Environment Variables (in `.env`)
```bash
# Your primary project
JIRA_DEFAULT_PROJECT=YOUR_PROJECT_KEY

# jiracli paths (configured during install)
JCLI_VENV_PATH=/absolute/path/to/jiracli/venv
JCLI_WORKING_DIR=/absolute/path/to/jiracli

# Optional
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

### Multi-Project Usage Patterns
- **Default Project**: Uses configured default when no project specified
- **Per-Query Override**: *"Get latest issues from PROJECT2"*
- **Cross-Project Search**: *"Search 'security' across all projects"*

## 🚨 Troubleshooting

### Server Won't Start
```bash
# Check Node.js version (18+ required)
node --version

# Verify environment variables are loaded
cat .env

# Test jiracli manually
source /your/jiracli/path/venv/bin/activate && jcli --version
```

### Sprint Data Issues
```bash
# Test board access manually
source /your/jiracli/path/venv/bin/activate
jcli boards list
jcli boards sprints "YourBoardName" --json
```

### Multi-Project Access
```bash
# Verify project permissions
jcli issues list --jql "project = OTHERPROJECT" --max-issues 1
```

### MCP Connection Issues
- **Check server logs** in the terminal running `./start-server.sh`
- **Verify config paths** match your actual file locations
- **Restart Claude Desktop** completely after config changes
- **Test basic connectivity**: Ask *"What are the latest issues?"*

### Common Issues
1. **Environment variables not loaded**: Ensure `.env` file exists and `start-server.sh` is used
2. **Path errors**: Use absolute paths in configuration
3. **jiracli not working**: Test jiracli commands manually first
4. **Permission issues**: Verify JIRA project access

## 📊 Expected Results

### Sprint Insights Example
```json
{
  "sprint_insights": [{
    "sprint_info": {
      "name": "Sprint 24",
      "state": "active",
      "start_date": "2024-01-01",
      "end_date": "2024-01-14"
    },
    "issue_analysis": {
      "total_issues": 25,
      "by_status": {
        "To Do": {"count": 8},
        "In Progress": {"count": 12}, 
        "Done": {"count": 5}
      },
      "by_assignee": {"alice": 8, "bob": 12},
      "unassigned_count": 5
    },
    "progress_metrics": {
      "completion_percentage": 20,
      "velocity_indicators": {
        "done_issues": 5,
        "in_progress_issues": 12,
        "todo_issues": 8
      }
    }
  }]
}
```

## 📁 Project Structure

```
jiracli-mcp/
├── server.js                    # Enhanced MCP server
├── package.json                 # Node.js dependencies
├── install.sh                   # Interactive installer
├── start-server.sh              # Server startup script
├── claude-config.json           # Generated MCP config (created by installer)
├── claude-desktop-config.json   # Template for config generation
├── config.example.json          # Manual setup template
├── .env                         # Environment configuration (created by installer)
└── README.md                   # This comprehensive guide
```

## 🎯 For Other Users

To set up on a different system:

1. **Clone this repository** to your target location
2. **Ensure jiracli is installed** and working on your system
3. **Run `./install.sh`** and provide your specific paths:
   - Your JIRA project key
   - Full path to your jiracli directory
4. **Follow the generated configuration** for Claude Desktop setup

**Note**: The installer validates all paths and tests jiracli before proceeding.

## 🎉 What's New in v2.0

- ✅ **Multi-Project Support** - Work with any JIRA project
- ✅ **Sprint Insights** - Comprehensive sprint analysis with velocity tracking
- ✅ **Board Management** - List and analyze boards across your instance
- ✅ **Progress Tracking** - Completion percentages and bottleneck identification
- ✅ **Portable Configuration** - Easy setup for any environment
- ✅ **Cross-Project Analytics** - Search and analyze across multiple projects
- ✅ **Enhanced Validation** - Robust configuration checking and error handling

---

**🚀 Your JIRA workflow is now AI-powered with comprehensive sprint insights!**

Ask Claude questions like: *"What boards are available and show me sprint insights for the most active one?"*