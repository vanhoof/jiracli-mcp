# jiracli-mcp - Quick Start Guide

## 🎯 What This Does

This MCP server creates a **comprehensive bridge** between Claude and your JIRA instance, enabling:

- Multi-project JIRA support with configurable defaults
- **Sprint insights** with progress tracking and velocity analysis  
- Board management and sprint filtering
- Cross-project search and analytics
- Smart duplicate detection and component expertise

## 🚀 Setup in 3 Steps

### Step 1: Install & Configure
```bash
cd /path/to/your/jiracli-mcp
./install.sh
```
*You will be prompted to provide:*
- **JIRA project key**: Your default project (e.g., FDP, PROJ, DEV)
- **jiracli path**: Full path to your jiracli installation directory

The installer will validate your jiracli installation before proceeding.

### Step 2: Start the Server
```bash
./start-server.sh
```
*Keep this terminal window open*

### Step 3: Configure Claude Desktop

1. **Copy the generated configuration** from `claude-config.json` to your Claude Desktop MCP settings
2. **Restart Claude Desktop** after adding the configuration

## 🗣️ Example Questions

### 🏃‍♂️ Sprint & Board Management
- *"What boards are available?"*
- *"Show me sprints for the DevOps board"*
- *"Give me insights on the current sprint for [BoardName]"*
- *"What's the progress in the active sprint?"*
- *"Show me sprint velocity and completion rates"*

### 📊 Project Analytics
- *"What are the latest FDP issues?"*
- *"Get the 10 most recent issues from PROJECT2"*
- *"Search for authentication issues across all projects"*

### 🔍 Issue Management
- *"Show me details for PROJ-456"*
- *"Is ISSUE-123 a duplicate?"*
- *"Who are the experts for networking components?"*
- *"Give me a triage summary for FDP-1510"*

### 🎯 Cross-Project Queries
- *"Search PROJECT3 for 'certificate' issues"*
- *"Find experts in PROJECT4 for API components"*
- *"Get latest issues from PROJ but limit to 5"*

## 🛠️ New Sprint Features

### `list_boards`
**What:** Lists all available JIRA boards
**Example:** *"What boards can I analyze?"*

### `get_board_sprints`
**What:** Get sprints with filtering (name, show-all, include-issues)
**Example:** *"Show me all sprints for the Backend board including closed ones"*

### `get_sprint_insights`
**What:** Comprehensive sprint analysis with:
- Progress percentages and velocity indicators
- Assignee workload distribution  
- Issue breakdown by status/column
- Completion tracking and bottleneck identification

**Example:** *"Analyze the current sprint progress for DevOps board"*

## 📈 Enhanced Multi-Project Tools

| Tool | Multi-Project Support | Example |
|------|----------------------|---------|
| `get_latest_issues` | ✅ Per-project or default | *"Latest issues from PROJ2"* |
| `search_issues` | ✅ Cross-project + filtering | *"Search auth in PROJECT3"* |  
| `get_issue_details` | ✅ Any project issue | *"Show PROJ-456"* |
| `analyze_duplicates` | ✅ Cross-project detection | *"Check ISSUE-123 duplicates"* |
| `get_component_experts` | ✅ Per-project expertise | *"PROJ4 networking experts"* |

## 🎪 Live Demo Sequence

Try this complete workflow:

1. **"What boards are available?"** *(discover your boards)*
2. **"Show me sprints for [pick a board name]"** *(see sprint structure)*  
3. **"Give me insights on the active sprint for [that board]"** *(detailed analysis)*
4. **"What are the latest issues from [your project]?"** *(recent work)*
5. **"Analyze [pick an issue] for duplicates"** *(smart detection)*

## 🔧 Configuration Features

### Environment Variables
- `JIRA_DEFAULT_PROJECT`: Your primary project (e.g., FDP, PROJ)
- `JCLI_VENV_PATH`: Path to jiracli virtual environment  
- `JCLI_WORKING_DIR`: jiracli working directory

### Multi-Project Override
Ask questions like:
- *"Get latest issues from PROJECT2"* (overrides default)
- *"Search PROJ3 for bugs"* (project-specific search)

## 🚨 Troubleshooting

**Sprint data not loading?**
```bash
# Test board access (use your actual jiracli path)
source /your/jiracli/path/venv/bin/activate
jcli boards list
jcli boards sprints "YourBoardName" --json
```

**Server configuration issues?**
- Check `.env` file has correct paths
- Verify `claude-config.json` paths match your system
- Ensure Claude Desktop restarted after config changes

**Multi-project not working?**
- Verify your JIRA permissions for other projects
- Test: `jcli issues list --jql "project = OTHERPROJ"`

---

**🎉 You're Ready!** Start exploring JIRA with comprehensive sprint insights and multi-project analytics through Claude!