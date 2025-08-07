# 🚀 jiracli-mcp - Complete Setup Guide

## ✅ Server Status: ENHANCED & READY

Your MCP server now supports **multi-project JIRA integration** with comprehensive **sprint insights**!

## 🎯 What This Gives You

Ask **natural language questions** to Claude about any JIRA project:

### 🏃‍♂️ Sprint Management
- *"What boards are available in my JIRA instance?"*
- *"Show me all sprints for the DevOps board"*
- *"Give me sprint insights with progress analysis"*
- *"What's the velocity in the current sprint?"*

### 📊 Multi-Project Analytics  
- *"What are the latest FDP issues?"*
- *"Get recent issues from PROJECT2"*
- *"Search authentication problems across projects"*
- *"Who are the experts for networking in PROJ3?"*

### 🔍 Enhanced Analysis
- *"Is PROJ-456 a duplicate of anything?"*
- *"Give me complete triage analysis for FDP-1510"*
- *"Find component experts with workload analysis"*

## 🔧 Setup Steps

### Step 1: Run the Interactive Installer

```bash
cd /path/to/your/jiracli-mcp
./install.sh
```

**The installer will prompt you for:**
- **Default JIRA project key** (e.g., FDP, PROJ, DEV)
- **Full path to jiracli directory** (must be an existing, working jiracli installation)

**⚠️ Important**: The installer validates your jiracli installation and will not proceed without a working setup.

### Step 2: Start the Server
```bash
./start-server.sh
```
**⚠️ Important**: Leave this terminal open - the server needs to stay running.

### Step 3: Configure Claude Desktop

#### Option A: Use Generated Config
1. **Copy the contents** of the generated `claude-config.json` 
2. **Paste into Claude Desktop MCP settings:**
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. **Restart Claude Desktop** completely

#### Example Configuration
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
*Replace paths with your actual installation locations*

### Step 4: Test the Enhanced Integration

#### 🔥 Sprint Features Test
- *"What boards are available?"*
- *"Show me sprints for [pick a board name]"*
- *"Give me insights on the active sprint"*

#### 🧠 Multi-Project Test
- *"What are the latest issues from [your default project]?"*
- *"Get 5 recent issues from [another project]"*
- *"Search for 'bug' across all my projects"*

## 🛠️ Enhanced Functions

### 🆕 Sprint & Board Management

| Function | What It Does | Example Question |
|----------|-------------|------------------|
| **list_boards** | Lists all JIRA boards | *"What boards exist?"* |
| **get_board_sprints** | Sprint list with filtering | *"Show DevOps board sprints"* |
| **get_sprint_insights** | Deep sprint analysis | *"Analyze current sprint progress"* |

### 📊 Sprint Insights Features
- **Progress Tracking**: Completion percentages, velocity indicators
- **Assignee Analysis**: Workload distribution, unassigned issues
- **Status Breakdown**: Issues by column/status with smart categorization
- **Active Sprint Detection**: Automatically focuses on current sprints

### 🔄 Enhanced Existing Functions

| Function | Multi-Project Support | Example |
|----------|---------------------|---------|
| **get_latest_issues** | ✅ Project parameter | *"Latest issues from PROJ2"* |
| **search_issues** | ✅ Cross-project search | *"Search auth in PROJECT3"* |
| **get_issue_details** | ✅ Any project issue | *"Show PROJ-456"* |
| **analyze_duplicates** | ✅ Cross-project detection | *"Check PROJ-123 duplicates"* |
| **get_component_experts** | ✅ Per-project experts | *"PROJ4 networking experts"* |
| **get_triage_summary** | ✅ Universal analysis | *"Triage any issue"* |

## 🎪 Complete Demo Workflow

Try this **comprehensive sequence**:

1. **Discovery**: *"What boards are available in JIRA?"*
2. **Sprint Overview**: *"Show me sprints for [board name]"*
3. **Deep Analysis**: *"Give me insights on the current sprint for [board]"*
4. **Issue Analysis**: *"What are the latest 5 issues from [project]?"*
5. **Smart Detection**: *"Analyze [issue key] for potential duplicates"*
6. **Expertise**: *"Who are experts for [component name]?"*

## 🔧 Configuration Options

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

**Override default project in queries:**
- *"Get latest issues from PROJECT2"*
- *"Search PROJ3 for authentication issues"* 
- *"Find DEVOPS experts for API components"*

**Cross-project analysis:**
- *"Search 'security' across all my projects"*
- *"Compare component experts between FDP and PROJ2"*

## 🔍 Expected Enhanced Results

### Sprint Insights ✅
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

### Multi-Project Data ✅
- Cross-project issue search with project context
- Project-specific expert recommendations  
- Configurable default project with per-query overrides

## 🚨 Troubleshooting

### Sprint Data Issues
```bash
# Test board access manually (use your actual paths)
source /your/jiracli/path/venv/bin/activate
jcli boards list
jcli boards sprints "YourBoardName" --json
```

### Multi-Project Access
```bash
# Verify project permissions
jcli issues list --jql "project = OTHERPROJECT" --max-issues 1
```

### Server Configuration
1. **Check paths**: Verify `.env` file has correct jiracli paths
2. **Test jiracli**: `source venv/bin/activate && jcli --version`
3. **Claude Desktop**: Ensure complete restart after config changes

### MCP Connection Issues  
- **Check server logs** in the terminal running `./start-server.sh`
- **Verify config paths** match your actual file locations
- **Test basic connectivity**: Ask *"What are the latest issues?"*

## 📊 File Structure

```
jiracli-mcp/
├── server.js                    # Enhanced MCP server
├── package.json                 # Updated dependencies  
├── install.sh                   # Interactive installer
├── start-server.sh              # Server startup script
├── claude-config.json           # Generated MCP config (created by installer)
├── claude-desktop-config.json   # Template for config generation
├── config.example.json          # Manual setup template
├── .env                         # Environment configuration (created by installer)
├── quick-start.md              # Updated quick start
└── SETUP_GUIDE.md              # This comprehensive guide
```

## 🎉 You're Ready for Enhanced JIRA!

Once configured:
1. ✅ **Server running** with multi-project support
2. ✅ **Sprint insights** with progress tracking
3. ✅ **Claude Desktop configured** with new capabilities
4. ✅ **Enhanced analytics** across all your JIRA projects

**Ask Claude**: *"What boards are available and show me sprint insights for the most active one?"*

You now have a comprehensive JIRA analytics and sprint management system powered by AI! 🚀

---

**Need help?** Check the enhanced server logs and test individual jcli commands as shown above.