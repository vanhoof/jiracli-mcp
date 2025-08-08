# jiracli-mcp

Universal JIRA MCP Server with multi-project integration, sprint insights, and comprehensive project analytics via jiracli.

## ✨ What This Does

This MCP server creates a powerful bridge between Claude and your JIRA instance, enabling:

- **🏃‍♂️ Sprint Insights**: Progress tracking, velocity analysis, assignee workload distribution
- **📊 Multi-Project Support**: Work across multiple JIRA projects with configurable defaults
- **🔍 Smart Analytics**: Duplicate detection, component experts, comprehensive triage assistance
- **🎯 Board Management**: List boards, analyze sprints, track completion metrics
- **🤖 Natural Language Interface**: Ask questions in plain English, get structured insights

## 🚀 Quick Setup

### Prerequisites

1. **Node.js 18+** installed
   ```bash
   node --version  # Should show v18.0.0 or higher
   ```

2. **jiracli installed and configured** with JIRA access and `.jira.yml` config
   
   **Source**: [jiracli on GitHub](https://github.com/apconole/jiracli)
   
   **Choose ONE of these installation methods:**
   
   **Option A: Virtual Environment Installation (Recommended)**
   - Install jiracli in a dedicated directory with Python virtual environment
   - More isolated, doesn't affect system Python packages
   - Example structure: `/path/to/jiracli/` with `venv/` subfolder
   - Follow the [jiracli installation guide](https://github.com/apconole/jiracli#installation)
   
   **Option B: Global Installation**
   - Install jcli globally accessible via PATH
   - Simpler setup, but affects system-wide Python packages
   - Follow the [jiracli installation guide](https://github.com/apconole/jiracli#installation)

3. **Claude Desktop** or MCP-compatible client

### Installation Steps

#### 1. Clone and Install
```bash
git clone <this-repository>
cd jiracli-mcp
./install.sh
```

**The installer automatically detects your jiracli setup:**
- **🔍 Auto-detection**: Checks if `jcli` is available globally
- **📋 Interactive prompts**: Guides you through configuration
- **✅ Validation**: Tests your jiracli installation before proceeding

**You'll be prompted for:**
- **Default JIRA project key** (e.g., PROJ, FDP, EXAMPLE)
- **Board names** for sprint tracking (comma-separated)
- **Installation type preference** (if both options are available)
- **Directory paths** (for virtual environment setups)

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

**Generated Configuration Examples:**

The installer creates a `claude-config.json` file with your specific paths. Here are the two possible formats:

**Virtual Environment Setup:**
```json
{
  "mcpServers": {
    "jiracli-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/jiracli-mcp/server.js"],
      "env": {
        "JIRA_DEFAULT_PROJECT": "EXAMPLE",
        "JIRA_BOARDS": "Board One,Board Two,Development Board",
        "JCLI_USE_GLOBAL": "false",
        "JCLI_VENV_PATH": "/absolute/path/to/jiracli/venv",
        "JCLI_WORKING_DIR": "/absolute/path/to/jiracli"
      }
    }
  }
}
```

**Global Installation Setup:**
```json
{
  "mcpServers": {
    "jiracli-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/jiracli-mcp/server.js"],
      "env": {
        "JIRA_DEFAULT_PROJECT": "EXAMPLE",
        "JIRA_BOARDS": "Board One,Board Two,Development Board",
        "JCLI_USE_GLOBAL": "true",
        "JCLI_WORKING_DIR": "/path/to/jiracli/working/directory"
      }
    }
  }
}
```

#### 4. Test the Integration

**Sprint Features Test:**
- *"What boards are available?"*
- *"Show me sprints for [board name]"*
- *"Give me insights on the active sprint"*

**Multi-Project Test:**
- *"What are the latest issues from [your default project]?"*
- *"Get 5 recent issues from [another project]"*
- *"Search for 'bug' across all my projects"*

## 🗣️ Example Questions

### 🏃‍♂️ Sprint & Board Management
- *"What boards are available in my JIRA instance?"*
- *"List all available boards"*
- *"Show me all sprints for the Development board"*
- *"Get board sprints for [BoardName]"*
- *"Give me insights on the current sprint with progress analysis"*
- *"What's the completion percentage and velocity in the active sprint?"*
- *"Show me sprint velocity and completion rates"*

### 📊 Multi-Project Analytics  
- *"What are the latest PROJECT issues?"*
- *"Get the 10 most recent issues from PROJ2"*
- *"Search for authentication issues across all projects"*
- *"Find experts for networking components in PROJ3"*

### 🔍 Issue Management
- *"Show me details for PROJ-456"*
- *"Is ISSUE-123 a duplicate across projects?"*
- *"Who are the experts for networking components?"*
- *"Give me a comprehensive triage summary for EXAMPLE-1510"*

### 🎯 Cross-Project Queries
- *"Search PROJECT3 for 'certificate' issues"*
- *"Find experts in PROJECT4 for API components"*
- *"Get latest issues from PROJ but limit to 5"*

## 🛠️ Available Tools

### 🆕 Sprint & Board Management

| Function | What It Does | Example Question |
|----------|-------------|------------------|
| **list_boards** | Lists all JIRA boards | *"What boards are available?"* |
| **list_configured_boards** | Shows configured boards with validation | *"What boards are configured?"* |
| **get_board_sprints** | Sprint list with filtering | *"Show DevOps board sprints"* |
| **get_sprint_insights** | Deep sprint analysis | *"Analyze current sprint progress"* |

#### Sprint Insights Features
- **Progress Tracking**: Completion percentages, velocity indicators
- **Assignee Analysis**: Workload distribution, unassigned issues
- **Status Breakdown**: Issues by column/status with smart categorization
- **Active Sprint Detection**: Automatically focuses on current sprints
- **Board Validation**: Direct validation using `jcli boards show`

### 📈 Enhanced Multi-Project Tools

| Function | Multi-Project Support | Description | Example |
|----------|---------------------|-------------|---------| 
| **get_latest_issues** | ✅ | Get recent issues by project | *"Latest issues from PROJ2"* |
| **search_issues** | ✅ | Cross-project search with JQL/keywords | *"Search auth in PROJECT3"* |
| **get_issue_details** | ✅ | Full details for any project issue | *"Show PROJ-456"* |
| **analyze_duplicates** | ✅ | Cross-project duplicate detection | *"Check ISSUE-123 duplicates"* |
| **get_component_experts** | ✅ | Per-project component experts | *"PROJ4 networking experts"* |
| **get_triage_summary** | ✅ | Universal triage analysis | *"Triage any issue"* |

## 🔧 Configuration

### Environment Variables (in `.env`)

The installer creates a `.env` file with your configuration. Here are examples:

**Virtual Environment Installation:**
```bash
# jiracli-mcp Configuration
JIRA_DEFAULT_PROJECT=EXAMPLE
JIRA_BOARDS=Board One,Board Two,Development Board
JCLI_USE_GLOBAL=false
JCLI_VENV_PATH=/Users/username/path/to/jiracli/venv
JCLI_WORKING_DIR=/Users/username/path/to/jiracli

# Optional settings
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

**Global Installation:**
```bash
# jiracli-mcp Configuration
JIRA_DEFAULT_PROJECT=EXAMPLE
JIRA_BOARDS=Board One,Board Two,Development Board
JCLI_USE_GLOBAL=true
JCLI_WORKING_DIR=/path/to/jiracli/working/directory

# Optional settings
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

### Configuration Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_DEFAULT_PROJECT` | ✅ | Your primary JIRA project key (e.g., EXAMPLE, FDP) |
| `JIRA_BOARDS` | ❌ | Comma-separated list of board names for sprint tracking |
| `JCLI_USE_GLOBAL` | ✅ | `true` for global jcli, `false` for virtual env |
| `JCLI_VENV_PATH` | Virtual env only | Path to jiracli virtual environment |
| `JCLI_WORKING_DIR` | ✅ | jiracli working directory |
| `MCP_SERVER_PORT` | ❌ | Server port (default: 3000) |
| `LOG_LEVEL` | ❌ | Logging level (default: info) |

### Multi-Project Usage Patterns
- **Default Project**: Uses configured default when no project specified
- **Per-Query Override**: *"Get latest issues from PROJECT2"*
- **Cross-Project Search**: *"Search 'security' across all projects"*

### Board Configuration
- **Optional Setup**: Configure commonly used boards in `JIRA_BOARDS`
- **Direct Validation**: Each configured board is validated using `jcli boards show`
- **Fallback Support**: Can still access any board even if not configured
- **Sprint Tracking**: Configured boards enable faster sprint operations

## 🚨 Troubleshooting

### Server Won't Start

**1. Check Node.js version:**
```bash
node --version  # Must be 18.0.0 or higher
```

**2. Verify environment variables:**
```bash
cat .env  # Check if variables are set correctly
```

**3. Test jiracli manually:**
```bash
# For virtual environment installation:
cd /your/jiracli/directory
source venv/bin/activate
jcli --version
jcli issues list --jql "project = YOUR_PROJECT" --max-issues 1

# For global installation:
jcli --version
jcli issues list --jql "project = YOUR_PROJECT" --max-issues 1
```

**4. Check JIRA configuration:**
```bash
# Ensure .jira.yml exists and is configured
ls -la ~/.jira.yml  # or check your jiracli directory
```

### Board Validation Issues
```bash
# Test board access manually

# For virtual environment:
source /your/jiracli/path/venv/bin/activate
jcli boards list
jcli boards show "Your Board Name"

# For global installation:
jcli boards list
jcli boards show "Your Board Name"
```

### Sprint Data Issues
```bash
# Test sprint access manually

# For virtual environment:
source /your/jiracli/path/venv/bin/activate
jcli boards sprints "YourBoardName" --json

# For global installation:
jcli boards sprints "YourBoardName" --json
```

### Multi-Project Access
```bash
# Test project permissions
jcli issues list --jql "project = OTHERPROJECT" --max-issues 1

# List all accessible projects
jcli projects list
```

### MCP Connection Issues
- **Check server logs** in the terminal running `./start-server.sh`
- **Verify config paths** match your actual file locations
- **Restart Claude Desktop** completely after config changes
- **Test basic connectivity**: Ask *"What are the latest issues?"*

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Node.js version error** | Install Node.js 18+ from [nodejs.org](https://nodejs.org) |
| **Environment variables not loaded** | Always use `./start-server.sh` to start the server |
| **Path errors in config** | Use absolute paths (starting with `/`) in all configuration |
| **jiracli commands fail** | Test jiracli manually first, ensure `.jira.yml` is configured |
| **JIRA permission denied** | Verify project access with `jcli projects list` |
| **Board validation fails** | Use exact board names as shown by `jcli boards list` |
| **Global jcli not found** | Follow [jiracli installation guide](https://github.com/apconole/jiracli#installation) or use virtual env setup |
| **Virtual env activation fails** | Ensure `venv/bin/activate` exists in your jiracli directory |
| **JSON parsing errors in Claude** | Server outputs non-JSON to stdout - check server logs |

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
├── config.example.json          # Virtual environment setup template
├── config-global.example.json   # Global installation setup template
├── .env                         # Environment configuration (created by installer)
└── README.md                   # This comprehensive guide
```

## 🎯 For Other Users

### Step-by-Step Setup for New Users

**1. Install Prerequisites**
```bash
# Install Node.js 18+ (if not already installed)
# Visit: https://nodejs.org

# Verify installation
node --version
npm --version
```

**2. Set up jiracli (Choose ONE method)**

**Option A: Virtual Environment (Recommended)**
```bash
# Create dedicated directory
mkdir ~/jiracli
cd ~/jiracli

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install and configure jiracli - follow the official guide:
# https://github.com/apconole/jiracli#installation
```

**Option B: Global Installation**
```bash
# Install and configure jiracli globally - follow the official guide:
# https://github.com/apconole/jiracli#installation
```

**3. Clone and Install jiracli-mcp**
```bash
git clone <this-repository>
cd jiracli-mcp
./install.sh
```

**4. Follow installer prompts**
- Provide your JIRA project key
- Enter board names for sprint tracking
- Choose installation type (auto-detected)
- Verify paths and configuration

**5. Configure Claude Desktop**
- Copy contents of generated `claude-config.json`
- Add to your Claude Desktop MCP settings
- Restart Claude Desktop

**Note**: The installer validates everything and provides specific error messages if something isn't working.

## Advanced Configuration

### Manual Environment Setup

If you need to manually configure (instead of using the installer):

1. **Copy template files:**
   - Virtual env: `cp config.example.json claude-config.json`
   - Global install: `cp config-global.example.json claude-config.json`

2. **Edit paths in `claude-config.json`**

3. **Create `.env` file with your settings** (see Configuration section above)

### Environment Variables Reference

- `JIRA_DEFAULT_PROJECT`: Your primary JIRA project key
- `JIRA_BOARDS`: Comma-separated list of board names (optional)
- `JCLI_USE_GLOBAL`: Set to `true` for global jcli, `false` for virtual env
- `JCLI_VENV_PATH`: Path to virtual environment (venv installs only)
- `JCLI_WORKING_DIR`: jiracli working directory
- `MCP_SERVER_PORT`: Server port (optional, default: 3000)
- `LOG_LEVEL`: Logging verbosity (optional, default: info)

## 🎉 Features

- ✅ **Multi-Project Support** - Work with any JIRA project
- ✅ **Sprint Insights** - Comprehensive sprint analysis with velocity tracking
- ✅ **Board Management** - List and analyze boards across your instance
- ✅ **Board Validation** - Direct validation using jcli boards show for accuracy
- ✅ **Progress Tracking** - Completion percentages and bottleneck identification
- ✅ **Dual Installation Support** - Works with both global and virtual environment jiracli
- ✅ **Cross-Project Analytics** - Search and analyze across multiple projects
- ✅ **Interactive Installer** - Auto-detection and guided setup
- ✅ **Robust Validation** - Configuration checking and error handling

---

**🚀 Your JIRA workflow is now AI-powered with comprehensive sprint insights!**

Ask Claude questions like: *"What boards are available and show me sprint insights for the most active one?"*