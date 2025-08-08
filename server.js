#!/usr/bin/env node

/**
 * jiracli-mcp
 * 
 * Universal JIRA MCP Server providing real-time access to JIRA issues across multiple projects
 * Features sprint insights, board management, and comprehensive project analytics
 * Configurable for any JIRA instance with jiracli integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

class JiraServer {
  constructor() {
    this.server = new Server(
      {
        name: 'jiracli-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Required configuration - no fallbacks
    this.venvPath = process.env.JCLI_VENV_PATH;
    this.workingDir = process.env.JCLI_WORKING_DIR;
    this.defaultProject = process.env.JIRA_DEFAULT_PROJECT;
    this.useGlobalJcli = process.env.JCLI_USE_GLOBAL === 'true';
    
    // Board configuration - parse comma-separated list
    this.configuredBoards = process.env.JIRA_BOARDS ? 
      process.env.JIRA_BOARDS.split(',').map(board => board.trim()).filter(board => board) : [];
    
    // Validate required configuration
    this.validateConfiguration();
    
    this.setupHandlers();
  }

  validateConfiguration() {
    const requiredEnvVars = ['JIRA_DEFAULT_PROJECT'];
    
    // Add conditional requirements based on installation type
    if (!this.useGlobalJcli) {
      // For venv installations, both are required
      requiredEnvVars.push('JCLI_VENV_PATH', 'JCLI_WORKING_DIR');
    }
    // For global installations, no additional env vars are required

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(envVar => {
        console.error(`   - ${envVar}`);
      });
      console.error('\n📖 Please configure these variables before starting the server.');
      console.error('   See README.md for setup instructions.');
      process.exit(1);
    }

    // Validate installation type and paths
    if (this.useGlobalJcli) {
      console.error('Using globally installed jcli');
      
      // Check if jcli is available globally
      try {
        execSync('which jcli', { stdio: 'pipe' });
      } catch (error) {
        console.error('Global jcli installation not found in PATH');
        console.error('Please install jcli globally or use venv installation');
        process.exit(1);
      }
      
      // Validate working directory if specified
      if (this.workingDir && !existsSync(this.workingDir)) {
        console.error(`JCLI working directory not found: ${this.workingDir}`);
        console.error('Please verify JCLI_WORKING_DIR points to a valid directory.');
        process.exit(1);
      }
    } else {
      console.error('Using virtual environment jcli');
      
      // Validate paths exist for venv installation
      if (!existsSync(this.venvPath)) {
        console.error(`JCLI virtual environment not found: ${this.venvPath}`);
        console.error('Please verify JCLI_VENV_PATH points to a valid jiracli venv directory.');
        console.error('Or set JCLI_USE_GLOBAL=true if using global installation.');
        process.exit(1);
      }

      if (!existsSync(this.workingDir)) {
        console.error(`JCLI working directory not found: ${this.workingDir}`);
        console.error('Please verify JCLI_WORKING_DIR points to a valid jiracli directory.');
        process.exit(1);
      }
    }

    console.error('Configuration validated successfully');
    console.error(`Default Project: ${this.defaultProject}`);
    console.error(`Installation Type: ${this.useGlobalJcli ? 'Global' : 'Virtual Environment'}`);
    console.error(`JCLI Directory: ${this.workingDir || 'Current directory'}`);
    console.error(`Configured Boards: ${this.configuredBoards.length > 0 ? this.configuredBoards.join(', ') : 'None - will list all available boards'}`);
    if (!this.useGlobalJcli) {
      console.error(`JCLI Venv: ${this.venvPath}`);
    }
  }

  async executeJCLI(command) {
    try {
      let fullCommand;
      
      if (this.useGlobalJcli) {
        // Use globally installed jcli
        if (this.workingDir) {
          fullCommand = `cd "${this.workingDir}" && ${command}`;
        } else {
          fullCommand = command;
        }
      } else {
        // Use virtual environment jcli
        fullCommand = `cd "${this.workingDir}" && source "${this.venvPath}/bin/activate" && ${command}`;
      }
      
      const { stdout, stderr } = await execAsync(fullCommand, { 
        shell: '/bin/bash',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
      
      if (stderr && !stderr.includes('WARNING')) {
        console.error('JCLI stderr:', stderr);
      }
      
      return stdout;
    } catch (error) {
      throw new Error(`JCLI execution failed: ${error.message}`);
    }
  }

  setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_latest_issues',
            description: 'Get the most recent issues with full details for a project',
            inputSchema: {
              type: 'object',
              properties: {
                project: {
                  type: 'string',
                  description: 'Project key (e.g., FDP, defaults to configured default)',
                },
                count: {
                  type: 'number',
                  description: 'Number of issues to retrieve (default: 5, max: 20)',
                  default: 5
                }
              }
            }
          },
          {
            name: 'get_issue_details',
            description: 'Get complete details for a specific issue',
            inputSchema: {
              type: 'object',
              properties: {
                issue_key: {
                  type: 'string',
                  description: 'Issue key (e.g., FDP-1510, PROJ-123)',
                }
              },
              required: ['issue_key']
            }
          },
          {
            name: 'search_issues',
            description: 'Search issues using JQL or text queries across projects',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (JQL or keywords)',
                },
                project: {
                  type: 'string',
                  description: 'Limit search to specific project (optional)',
                },
                max_results: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  default: 10
                }
              },
              required: ['query']
            }
          },
          {
            name: 'list_boards',
            description: 'List all available boards with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of boards to return (default: 25)',
                  default: 25
                }
              }
            }
          },
          {
            name: 'list_configured_boards',
            description: 'List boards configured in JIRA_BOARDS environment variable for easy sprint access',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_board_sprints',
            description: 'Get sprints for a specific board with filtering options. Uses configured boards from JIRA_BOARDS if no board specified.',
            inputSchema: {
              type: 'object',
              properties: {
                board_name: {
                  type: 'string',
                  description: 'Name of the board (optional if JIRA_BOARDS is configured)',
                },
                sprint_name: {
                  type: 'string',
                  description: 'Filter by specific sprint name (optional)',
                },
                show_all: {
                  type: 'boolean',
                  description: 'Include closed sprints (default: false)',
                  default: false
                },
                include_issues: {
                  type: 'boolean', 
                  description: 'Include issues in sprint details (default: true)',
                  default: true
                }
              },
              required: []
            }
          },
          {
            name: 'get_sprint_insights',
            description: 'Get comprehensive insights for current/active sprints including progress analysis. Uses configured boards from JIRA_BOARDS if no board specified.',
            inputSchema: {
              type: 'object',
              properties: {
                board_name: {
                  type: 'string',
                  description: 'Name of the board to analyze (optional if JIRA_BOARDS is configured)',
                },
                sprint_name: {
                  type: 'string',
                  description: 'Specific sprint name (optional, defaults to active sprint)',
                }
              },
              required: []
            }
          },
          {
            name: 'analyze_duplicates',
            description: 'Analyze an issue for potential duplicates against historical data',
            inputSchema: {
              type: 'object',
              properties: {
                issue_key: {
                  type: 'string',
                  description: 'Issue key to analyze',
                },
                project: {
                  type: 'string',
                  description: 'Project to search within (optional, defaults to issue project)',
                }
              },
              required: ['issue_key']
            }
          },
          {
            name: 'get_component_experts',
            description: 'Find experts for specific components based on historical assignments',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  description: 'Component name',
                },
                project: {
                  type: 'string',
                  description: 'Project key (optional, defaults to configured default)',
                }
              },
              required: ['component']
            }
          },
          {
            name: 'get_triage_summary',
            description: 'Get comprehensive triage analysis for an issue',
            inputSchema: {
              type: 'object',
              properties: {
                issue_key: {
                  type: 'string',
                  description: 'Issue key for triage analysis',
                }
              },
              required: ['issue_key']
            }
          },
          {
            name: 'get_project_analytics',
            description: 'Get comprehensive project analytics including velocity, health metrics, and trends',
            inputSchema: {
              type: 'object',
              properties: {
                project: {
                  type: 'string',
                  description: 'Project key (optional, defaults to configured default)',
                },
                days_back: {
                  type: 'number',
                  description: 'Number of days to analyze (default: 30)',
                  default: 30
                }
              }
            }
          },
          {
            name: 'get_user_workload',
            description: 'Analyze user workload across projects with capacity insights',
            inputSchema: {
              type: 'object',
              properties: {
                user: {
                  type: 'string',
                  description: 'Username or display name (optional, shows all users if not specified)',
                },
                project: {
                  type: 'string',
                  description: 'Project key (optional, defaults to configured default)',
                }
              }
            }
          },
          {
            name: 'get_release_readiness',
            description: 'Analyze release readiness with version completion metrics',
            inputSchema: {
              type: 'object',
              properties: {
                version: {
                  type: 'string',
                  description: 'Version name or pattern to analyze',
                },
                project: {
                  type: 'string',
                  description: 'Project key (optional, defaults to configured default)',
                }
              },
              required: ['version']
            }
          },
          {
            name: 'get_component_health',
            description: 'Analyze component health metrics including issue distribution and trends',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  description: 'Specific component name (optional, analyzes all components if not specified)',
                },
                project: {
                  type: 'string',
                  description: 'Project key (optional, defaults to configured default)',
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_latest_issues':
            return await this.getLatestIssues(args?.project, args?.count || 5);
            
          case 'get_issue_details':
            return await this.getIssueDetails(args.issue_key);
            
          case 'search_issues':
            return await this.searchIssues(args.query, args?.project, args?.max_results || 10);
            
          case 'list_boards':
            return await this.listBoards(args?.limit || 25);
            
          case 'list_configured_boards':
            return await this.listConfiguredBoards();
            
          case 'get_board_sprints':
            return await this.getBoardSprints(args.board_name, args?.sprint_name, args?.show_all || false, args?.include_issues !== false);
            
          case 'get_sprint_insights':
            return await this.getSprintInsights(args.board_name, args?.sprint_name);
            
          case 'analyze_duplicates':
            return await this.analyzeDuplicates(args.issue_key, args?.project);
            
          case 'get_component_experts':
            return await this.getComponentExperts(args.component, args?.project);
            
          case 'get_triage_summary':
            return await this.getTriageSummary(args.issue_key);
            
          case 'get_project_analytics':
            return await this.getProjectAnalytics(args?.project, args?.days_back || 30);
            
          case 'get_user_workload':
            return await this.getUserWorkload(args?.user, args?.project);
            
          case 'get_release_readiness':
            return await this.getReleaseReadiness(args.version, args?.project);
            
          case 'get_component_health':
            return await this.getComponentHealth(args?.component, args?.project);
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async getLatestIssues(project, count = 5) {
    try {
      const projectKey = project || this.defaultProject;
      const maxCount = Math.min(count, 20); // Safety limit
      const command = `jcli issues list --jql "project = ${projectKey} ORDER BY created DESC" --max-issues ${maxCount} --output json --summary-len 0`;
      const output = await this.executeJCLI(command);
      
      const data = JSON.parse(output);
      const issues = data.issues || [];
      
      // Format for better readability
      const formattedIssues = issues.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name || 'Undefined',
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        created: issue.fields.created,
        updated: issue.fields.updated,
        components: issue.fields.components?.map(c => c.name) || [],
        labels: issue.fields.labels || [],
        description: issue.fields.description?.substring(0, 500) + '...' || 'No description'
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              total_count: data.issues_count,
              issues: formattedIssues,
              query_timestamp: new Date().toISOString(),
              note: `Retrieved ${formattedIssues.length} most recent ${projectKey} issues`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving latest issues: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getIssueDetails(issueKey) {
    try {
      const command = `jcli issues show ${issueKey} --raw --json`;
      const output = await this.executeJCLI(command);
      
      const data = JSON.parse(output);
      const issue = data[0]; // Raw output is an array
      
      // Extract key information
      const details = {
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description || 'No description',
        status: issue.fields.status.name,
        priority: issue.fields.priority?.name || 'Undefined',
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        reporter: issue.fields.reporter?.displayName || 'Unknown',
        created: issue.fields.created,
        updated: issue.fields.updated,
        components: issue.fields.components?.map(c => ({ name: c.name, description: c.description })) || [],
        labels: issue.fields.labels || [],
        issue_type: issue.fields.issuetype.name,
        links: issue.fields.issuelinks?.map(link => ({
          relationship: link.type.name,
          target: link.outwardIssue?.key || link.inwardIssue?.key,
          target_summary: link.outwardIssue?.fields?.summary || link.inwardIssue?.fields?.summary
        })) || [],
        comments: issue.fields.comment?.comments?.map(c => ({
          author: c.author.displayName,
          created: c.created,
          body: c.body.substring(0, 1000) + (c.body.length > 1000 ? '...' : '')
        })) || [],
        watchers: issue.fields.watches?.watchCount || 0,
        votes: issue.fields.votes?.votes || 0
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(details, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving issue ${issueKey}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async searchIssues(query, project, maxResults = 10) {
    try {
      let jqlQuery;
      
      // Check if it's already a JQL query
      if (query.toLowerCase().includes('project =') || query.toLowerCase().includes('jql')) {
        jqlQuery = query;
      } else {
        // Convert keywords to JQL with project filter
        const projectKey = project || this.defaultProject;
        jqlQuery = `project = ${projectKey} AND (summary ~ "${query}" OR description ~ "${query}" OR comment ~ "${query}")`;
      }
      
      const command = `jcli issues list --jql "${jqlQuery}" --max-issues ${maxResults} --output json --summary-len 0`;
      const output = await this.executeJCLI(command);
      
      const data = JSON.parse(output);
      const issues = data.issues || [];
      
      const searchResults = {
        query: query,
        jql_used: jqlQuery,
        total_found: data.issues_count,
        results: issues.map(issue => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          assignee: issue.fields.assignee?.displayName || 'Unassigned',
          created: issue.fields.created,
          components: issue.fields.components?.map(c => c.name) || [],
          description_snippet: issue.fields.description?.substring(0, 200) + '...' || 'No description'
        }))
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(searchResults, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching issues: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async listBoards(limit = 25) {
    try {
      const command = `jcli boards list --limit ${limit}`;
      const output = await this.executeJCLI(command);
      
      // Parse the tabulated output - jcli doesn't provide JSON for boards list yet
      const lines = output.trim().split('\n');
      const boards = [];
      
      // Skip header and separator lines
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('+') && !line.startsWith('|')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p);
          if (parts.length >= 2) {
            boards.push({
              name: parts[0],
              type: parts[1]
            });
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              boards: boards,
              total_count: boards.length,
              query_timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing boards: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async listConfiguredBoards() {
    try {
      if (this.configuredBoards.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                configured_boards: [],
                message: 'No boards configured in JIRA_BOARDS environment variable',
                suggestion: 'Use list_boards tool to see all available boards, then configure JIRA_BOARDS in your .env file'
              }, null, 2)
            }
          ]
        };
      }

      // Validate configured boards exist
      const boardValidation = await this.validateConfiguredBoards();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              configured_boards: this.configuredBoards,
              validation: boardValidation,
              usage: 'These boards can be used with sprint-related commands. Use board names as listed above.',
              query_timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing configured boards: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async validateConfiguredBoards() {
    try {
      // Validate each configured board by attempting to show it directly
      const validation = await Promise.all(
        this.configuredBoards.map(async (configBoard) => {
          try {
            const command = `jcli boards show "${configBoard}"`;
            await this.executeJCLI(command);
            return {
              board_name: configBoard,
              exists: true,
              suggestion: null
            };
          } catch (error) {
            return {
              board_name: configBoard,
              exists: false,
              suggestion: `Board "${configBoard}" not found. Use list_boards to see available boards.`,
              error: error.message
            };
          }
        })
      );
      
      return {
        total_configured: this.configuredBoards.length,
        valid_boards: validation.filter(v => v.exists).length,
        invalid_boards: validation.filter(v => !v.exists).length,
        board_details: validation
      };
      
    } catch (error) {
      return {
        error: 'Could not validate boards - jcli boards list failed',
        message: error.message
      };
    }
  }

  suggestBoardFromConfigured(partialName) {
    if (this.configuredBoards.length === 0) {
      return null;
    }
    
    if (!partialName) {
      // Return first configured board as default
      return this.configuredBoards[0];
    }
    
    // Find best match from configured boards
    const lowercasePartial = partialName.toLowerCase();
    const exactMatch = this.configuredBoards.find(board => 
      board.toLowerCase() === lowercasePartial
    );
    
    if (exactMatch) return exactMatch;
    
    // Find partial match
    const partialMatch = this.configuredBoards.find(board =>
      board.toLowerCase().includes(lowercasePartial) ||
      lowercasePartial.includes(board.toLowerCase())
    );
    
    return partialMatch || this.configuredBoards[0];
  }

  async getBoardSprints(boardName, sprintName, showAll = false, includeIssues = true) {
    try {
      // Auto-suggest board if not provided or use configured boards
      let actualBoardName = boardName;
      if (!boardName && this.configuredBoards.length > 0) {
        actualBoardName = this.configuredBoards[0];
        console.error(`No board specified, using configured board: ${actualBoardName}`);
      } else if (boardName) {
        // Try to find better match from configured boards
        const suggestedBoard = this.suggestBoardFromConfigured(boardName);
        if (suggestedBoard && suggestedBoard !== boardName) {
          console.error(`Board suggestion: Using '${suggestedBoard}' instead of '${boardName}'`);
          actualBoardName = suggestedBoard;
        }
      }
      
      if (!actualBoardName) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'No board specified and no boards configured',
                suggestion: 'Either provide a board_name parameter or configure JIRA_BOARDS in .env',
                help: 'Use list_boards or list_configured_boards to see available options'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
      
      let command = `jcli boards sprints "${actualBoardName}" --json`;
      
      if (sprintName) {
        command += ` --name "${sprintName}"`;
      }
      if (showAll) {
        command += ' --show-all';
      }
      if (!includeIssues) {
        command += ' --no-issues';
      }
      
      const output = await this.executeJCLI(command);
      const sprints = JSON.parse(output);
      
      const sprintData = {
        board_name: actualBoardName,
        original_board_request: boardName !== actualBoardName ? boardName : null,
        filters_applied: {
          sprint_name: sprintName || null,
          show_all: showAll,
          include_issues: includeIssues
        },
        sprints: sprints,
        total_sprints: sprints.length,
        query_timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sprintData, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting board sprints for ${actualBoardName || boardName}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getSprintInsights(boardName, sprintName) {
    try {
      // Auto-suggest board if not provided or use configured boards
      let actualBoardName = boardName;
      if (!boardName && this.configuredBoards.length > 0) {
        actualBoardName = this.configuredBoards[0];
        console.error(`No board specified, using configured board: ${actualBoardName}`);
      } else if (boardName) {
        // Try to find better match from configured boards
        const suggestedBoard = this.suggestBoardFromConfigured(boardName);
        if (suggestedBoard && suggestedBoard !== boardName) {
          console.error(`Board suggestion: Using '${suggestedBoard}' instead of '${boardName}'`);
          actualBoardName = suggestedBoard;
        }
      }
      
      if (!actualBoardName) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'No board specified and no boards configured',
                suggestion: 'Either provide a board_name parameter or configure JIRA_BOARDS in .env',
                help: 'Use list_boards or list_configured_boards to see available options'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
      
      // Get current/active sprints
      let command = `jcli boards sprints "${actualBoardName}" --json`;
      if (sprintName) {
        command += ` --name "${sprintName}"`;
      }
      
      const output = await this.executeJCLI(command);
      const sprints = JSON.parse(output);
      
      if (!sprints || sprints.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No sprints found for board ${actualBoardName}${sprintName ? ` with name ${sprintName}` : ''}`
            }
          ]
        };
      }

      // Focus on active sprints if no specific sprint requested
      let targetSprints = sprints;
      if (!sprintName) {
        targetSprints = sprints.filter(s => s.state === 'active') || sprints.slice(0, 1);
      }

      const insights = [];
      
      for (const sprint of targetSprints) {
        const sprintInsight = {
          sprint_info: {
            name: sprint.name,
            id: sprint.id,
            state: sprint.state || 'unknown',
            start_date: sprint.start_date_str,
            end_date: sprint.end_date_str
          },
          issue_analysis: {
            total_issues: 0,
            by_status: {},
            by_assignee: {},
            unassigned_count: 0
          },
          progress_metrics: {
            completion_percentage: 0,
            velocity_indicators: {
              done_issues: 0,
              in_progress_issues: 0,
              todo_issues: 0
            }
          }
        };

        // Analyze issues in each column
        if (sprint.columns) {
          let totalIssues = 0;
          let doneIssues = 0;
          
          for (const [columnName, issues] of Object.entries(sprint.columns)) {
            const issueCount = issues.length;
            totalIssues += issueCount;
            
            sprintInsight.issue_analysis.by_status[columnName] = {
              count: issueCount,
              issues: issues.map(issue => typeof issue === 'string' ? { key: issue } : issue)
            };
            
            // Categorize for velocity calculation
            const columnLower = columnName.toLowerCase();
            if (columnLower.includes('done') || columnLower.includes('closed') || columnLower.includes('complete')) {
              doneIssues += issueCount;
              sprintInsight.progress_metrics.velocity_indicators.done_issues += issueCount;
            } else if (columnLower.includes('progress') || columnLower.includes('review') || columnLower.includes('testing')) {
              sprintInsight.progress_metrics.velocity_indicators.in_progress_issues += issueCount;
            } else {
              sprintInsight.progress_metrics.velocity_indicators.todo_issues += issueCount;
            }

            // Analyze assignees
            issues.forEach(issue => {
              const assignee = (typeof issue === 'object' && issue.assignee) ? issue.assignee : 'Unassigned';
              if (assignee === 'Unassigned' || !assignee) {
                sprintInsight.issue_analysis.unassigned_count++;
              } else {
                sprintInsight.issue_analysis.by_assignee[assignee] = 
                  (sprintInsight.issue_analysis.by_assignee[assignee] || 0) + 1;
              }
            });
          }
          
          sprintInsight.issue_analysis.total_issues = totalIssues;
          sprintInsight.progress_metrics.completion_percentage = 
            totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;
        }

        insights.push(sprintInsight);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              board_name: actualBoardName,
              original_board_request: boardName !== actualBoardName ? boardName : null,
              analysis_timestamp: new Date().toISOString(),
              sprint_insights: insights,
              summary: {
                total_sprints_analyzed: insights.length,
                active_sprints: insights.filter(i => i.sprint_info.state === 'active').length
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting sprint insights for ${actualBoardName || boardName}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async analyzeDuplicates(issueKey, project) {
    try {
      // Get the issue details first
      const issueCommand = `jcli issues show ${issueKey} --raw --json`;
      const issueOutput = await this.executeJCLI(issueCommand);
      const issueData = JSON.parse(issueOutput)[0];
      
      // Extract keywords for similarity search
      const summary = issueData.fields.summary;
      const description = issueData.fields.description || '';
      const components = issueData.fields.components?.map(c => c.name) || [];
      
      // Search for similar issues
      const keywords = this.extractKeywords(summary + ' ' + description);
      const searchQuery = keywords.slice(0, 3).join(' OR '); // Use top 3 keywords
      
      // Use project from parameter or extract from issue key
      let projectKey = project;
      if (!projectKey) {
        projectKey = issueKey.split('-')[0]; // Extract project from issue key like FDP-1510
      }
      
      const searchCommand = `jcli issues list --jql "project = ${projectKey} AND key != ${issueKey} AND (summary ~ \\"${searchQuery}\\" OR description ~ \\"${searchQuery}\\") ORDER BY created DESC" --max-issues 10 --output json --summary-len 0`;
      const searchOutput = await this.executeJCLI(searchCommand);
      const searchData = JSON.parse(searchOutput);
      
      // Analyze similarity
      const potentialDuplicates = searchData.issues?.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        similarity_score: this.calculateSimilarity(summary, issue.fields.summary),
        common_components: this.findCommonElements(components, issue.fields.components?.map(c => c.name) || []),
        created: issue.fields.created
      })) || [];
      
      // Sort by similarity
      potentialDuplicates.sort((a, b) => b.similarity_score - a.similarity_score);
      
      const analysis = {
        analyzed_issue: {
          key: issueKey,
          summary: summary,
          components: components
        },
        duplicate_analysis: {
          potential_duplicates_found: potentialDuplicates.length,
          high_similarity_matches: potentialDuplicates.filter(d => d.similarity_score > 0.7),
          medium_similarity_matches: potentialDuplicates.filter(d => d.similarity_score > 0.4 && d.similarity_score <= 0.7),
          all_matches: potentialDuplicates
        },
        recommendations: {
          action: potentialDuplicates.length > 0 && potentialDuplicates[0].similarity_score > 0.7 
            ? 'REVIEW_FOR_DUPLICATES' 
            : 'PROCEED_WITH_ISSUE',
          confidence: potentialDuplicates.length > 0 ? 'Medium' : 'High',
          top_candidate: potentialDuplicates.length > 0 ? potentialDuplicates[0] : null
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing duplicates for ${issueKey}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getComponentExperts(component, project) {
    try {
      // Search for issues with this component
      const projectKey = project || this.defaultProject;
      const command = `jcli issues list --jql "project = ${projectKey} AND component = \\"${component}\\"" --max-issues 50 --output json --summary-len 0`;
      const output = await this.executeJCLI(command);
      const data = JSON.parse(output);
      
      // Analyze assignee patterns
      const assigneeStats = {};
      
      data.issues?.forEach(issue => {
        const assignee = issue.fields.assignee?.displayName;
        if (assignee) {
          if (!assigneeStats[assignee]) {
            assigneeStats[assignee] = {
              name: assignee,
              total_issues: 0,
              closed_issues: 0,
              open_issues: 0,
              recent_activity: []
            };
          }
          
          assigneeStats[assignee].total_issues++;
          if (issue.fields.status.name === 'Closed' || issue.fields.status.name === 'Done') {
            assigneeStats[assignee].closed_issues++;
          } else {
            assigneeStats[assignee].open_issues++;
          }
          
          assigneeStats[assignee].recent_activity.push({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            updated: issue.fields.updated
          });
        }
      });
      
      // Sort experts by experience
      const experts = Object.values(assigneeStats)
        .map(expert => ({
          ...expert,
          completion_rate: expert.total_issues > 0 ? expert.closed_issues / expert.total_issues : 0,
          recent_activity: expert.recent_activity.slice(0, 3) // Last 3 issues
        }))
        .sort((a, b) => b.total_issues - a.total_issues);

      const expertAnalysis = {
        component: component,
        total_issues_analyzed: data.issues_count,
        experts: experts,
        recommendations: {
          primary_expert: experts[0] || null,
          most_active_recently: experts.find(e => e.open_issues > 0) || null,
          highest_completion_rate: experts.sort((a, b) => b.completion_rate - a.completion_rate)[0] || null
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(expertAnalysis, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing component experts for ${component}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getTriageSummary(issueKey) {
    try {
      // Get issue details
      const issueDetails = await this.getIssueDetails(issueKey);
      const issueData = JSON.parse(issueDetails.content[0].text);
      
      // Run duplicate analysis
      const duplicateAnalysis = await this.analyzeDuplicates(issueKey);
      const duplicateData = JSON.parse(duplicateAnalysis.content[0].text);
      
      // Get component experts if available
      let expertAnalysis = null;
      if (issueData.components.length > 0) {
        const expertResult = await this.getComponentExperts(issueData.components[0].name);
        expertAnalysis = JSON.parse(expertResult.content[0].text);
      }
      
      // Generate comprehensive triage summary
      const triageSummary = {
        issue_overview: {
          key: issueData.key,
          summary: issueData.summary,
          status: issueData.status,
          priority: issueData.priority,
          assignee: issueData.assignee,
          age_days: Math.floor((new Date() - new Date(issueData.created)) / (1000 * 60 * 60 * 24)),
          components: issueData.components.map(c => c.name)
        },
        duplicate_risk: {
          risk_level: duplicateData.recommendations.action === 'REVIEW_FOR_DUPLICATES' ? 'HIGH' : 'LOW',
          potential_duplicates: duplicateData.duplicate_analysis.potential_duplicates_found,
          top_match: duplicateData.duplicate_analysis.all_matches[0] || null
        },
        assignment_analysis: expertAnalysis ? {
          current_assignee_expertise: expertAnalysis.experts.find(e => e.name === issueData.assignee) || null,
          recommended_expert: expertAnalysis.recommendations.primary_expert,
          component_workload: expertAnalysis.experts.map(e => ({ name: e.name, open_issues: e.open_issues }))
        } : null,
        triage_recommendations: [
          {
            priority: duplicateData.recommendations.action === 'REVIEW_FOR_DUPLICATES' ? 'HIGH' : 'LOW',
            action: duplicateData.recommendations.action,
            reason: duplicateData.recommendations.action === 'REVIEW_FOR_DUPLICATES' 
              ? 'Potential duplicate detected - review before proceeding'
              : 'No duplicates found - proceed with normal triage'
          }
        ],
        next_steps: this.generateNextSteps(issueData, duplicateData, expertAnalysis)
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(triageSummary, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating triage summary for ${issueKey}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // Helper methods
  extractKeywords(text) {
    if (!text) return [];
    
    // Remove common words and extract meaningful terms
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    return [...new Set(words)];
  }

  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(this.extractKeywords(text1));
    const words2 = new Set(this.extractKeywords(text2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  findCommonElements(arr1, arr2) {
    return arr1.filter(item => arr2.includes(item));
  }

  generateNextSteps(issueData, duplicateData, expertAnalysis) {
    const steps = [];
    
    if (duplicateData.recommendations.action === 'REVIEW_FOR_DUPLICATES') {
      steps.push(`Review potential duplicate: ${duplicateData.duplicate_analysis.all_matches[0]?.key}`);
    }
    
    if (expertAnalysis && issueData.assignee === 'Unassigned') {
      steps.push(`Consider assigning to ${expertAnalysis.recommendations.primary_expert?.name} (component expert)`);
    }
    
    if (issueData.status === 'New' || issueData.status === 'To Do') {
      steps.push('Move to In Progress and begin investigation');
    }
    
    steps.push('Add any missing components or labels for better tracking');
    
    return steps;
  }

  calculateProjectMetrics(createdIssues, resolvedIssues, openIssues, daysBack) {
    const now = new Date();
    
    // Velocity calculations
    const issuesPerDay = createdIssues.length / daysBack;
    const resolutionRate = resolvedIssues.length / daysBack;
    const netGrowthRate = issuesPerDay - resolutionRate;
    
    // Priority distribution
    const priorityDistribution = {};
    const statusDistribution = {};
    const assigneeDistribution = {};
    
    openIssues.forEach(issue => {
      const priority = issue.fields.priority?.name || 'Undefined';
      const status = issue.fields.status.name;
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      assigneeDistribution[assignee] = (assigneeDistribution[assignee] || 0) + 1;
    });
    
    // Age analysis
    const issueAges = openIssues.map(issue => {
      const created = new Date(issue.fields.created);
      return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    });
    
    const avgAge = issueAges.length > 0 ? issueAges.reduce((a, b) => a + b, 0) / issueAges.length : 0;
    const oldIssues = issueAges.filter(age => age > 30).length;
    
    // Resolution time analysis for resolved issues
    const resolutionTimes = resolvedIssues
      .filter(issue => issue.fields.created && issue.fields.resolved)
      .map(issue => {
        const created = new Date(issue.fields.created);
        const resolved = new Date(issue.fields.resolved);
        return Math.floor((resolved - created) / (1000 * 60 * 60 * 24));
      });
    
    const avgResolutionTime = resolutionTimes.length > 0 ? 
      resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;
    
    return {
      velocity: {
        issues_created_per_day: Math.round(issuesPerDay * 100) / 100,
        issues_resolved_per_day: Math.round(resolutionRate * 100) / 100,
        net_growth_rate: Math.round(netGrowthRate * 100) / 100,
        total_created: createdIssues.length,
        total_resolved: resolvedIssues.length
      },
      health: {
        total_open_issues: openIssues.length,
        unassigned_issues: assigneeDistribution['Unassigned'] || 0,
        average_issue_age_days: Math.round(avgAge * 100) / 100,
        issues_older_than_30_days: oldIssues,
        average_resolution_time_days: Math.round(avgResolutionTime * 100) / 100
      },
      trends: {
        velocity_trend: netGrowthRate > 0 ? 'INCREASING_BACKLOG' : netGrowthRate < 0 ? 'DECREASING_BACKLOG' : 'STABLE',
        health_score: this.calculateHealthScore(openIssues.length, oldIssues, assigneeDistribution['Unassigned'] || 0)
      },
      distribution: {
        by_priority: priorityDistribution,
        by_status: statusDistribution,
        by_assignee: Object.fromEntries(
          Object.entries(assigneeDistribution)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
        )
      }
    };
  }

  calculateHealthScore(totalOpen, oldIssues, unassigned) {
    let score = 100;
    
    // Penalize for too many open issues
    if (totalOpen > 100) score -= 20;
    else if (totalOpen > 50) score -= 10;
    
    // Penalize for old issues
    const oldPercentage = totalOpen > 0 ? (oldIssues / totalOpen) * 100 : 0;
    if (oldPercentage > 30) score -= 30;
    else if (oldPercentage > 15) score -= 15;
    
    // Penalize for unassigned issues
    const unassignedPercentage = totalOpen > 0 ? (unassigned / totalOpen) * 100 : 0;
    if (unassignedPercentage > 25) score -= 20;
    else if (unassignedPercentage > 10) score -= 10;
    
    return Math.max(0, score);
  }

  async getProjectAnalytics(project, daysBack = 30) {
    try {
      const projectKey = project || this.defaultProject;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      // Get issues created in the time period
      const createdCommand = `jcli issues list --jql "project = ${projectKey} AND created >= '${startDateStr}'" --max-issues 1000 --output json --summary-len 0`;
      const createdOutput = await this.executeJCLI(createdCommand);
      const createdData = JSON.parse(createdOutput);
      
      // Get issues resolved in the time period  
      const resolvedCommand = `jcli issues list --jql "project = ${projectKey} AND resolved >= '${startDateStr}'" --max-issues 1000 --output json --summary-len 0`;
      const resolvedOutput = await this.executeJCLI(resolvedCommand);
      const resolvedData = JSON.parse(resolvedOutput);
      
      // Get all open issues for current state
      const openCommand = `jcli issues list --jql "project = ${projectKey} AND status in (Open, 'In Progress', 'To Do', New, Reopened)" --max-issues 1000 --output json --summary-len 0`;
      const openOutput = await this.executeJCLI(openCommand);
      const openData = JSON.parse(openOutput);
      
      // Calculate analytics
      const analytics = this.calculateProjectMetrics(createdData.issues || [], resolvedData.issues || [], openData.issues || [], daysBack);
      
      const projectAnalytics = {
        project: projectKey,
        analysis_period: {
          start_date: startDateStr,
          end_date: new Date().toISOString().split('T')[0],
          days_analyzed: daysBack
        },
        velocity_metrics: analytics.velocity,
        health_indicators: analytics.health,
        trend_analysis: analytics.trends,
        issue_distribution: analytics.distribution,
        generated_at: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projectAnalytics, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error generating project analytics: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  analyzeUserWorkload(allAssigned, inProgress, specificUser) {
    const userStats = {};
    const now = new Date();
    
    // Analyze all assigned issues
    allAssigned.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName;
      if (!assignee) return;
      
      if (!userStats[assignee]) {
        userStats[assignee] = {
          name: assignee,
          total_assigned: 0,
          in_progress: 0,
          open: 0,
          done: 0,
          high_priority: 0,
          critical_priority: 0,
          overdue: 0,
          avg_age_days: 0,
          issue_ages: [],
          recent_activity: []
        };
      }
      
      const stats = userStats[assignee];
      stats.total_assigned++;
      
      const priority = issue.fields.priority?.name || '';
      const status = issue.fields.status.name;
      const created = new Date(issue.fields.created);
      const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      
      stats.issue_ages.push(ageDays);
      
      // Categorize by status
      if (status.toLowerCase().includes('done') || status.toLowerCase().includes('closed')) {
        stats.done++;
      } else if (status.toLowerCase().includes('progress') || status.toLowerCase().includes('review')) {
        stats.in_progress++;
      } else {
        stats.open++;
      }
      
      // Priority analysis
      if (priority.toLowerCase().includes('high')) stats.high_priority++;
      if (priority.toLowerCase().includes('critical') || priority.toLowerCase().includes('blocker')) {
        stats.critical_priority++;
      }
      
      // Check for overdue (more than 60 days old and not done)
      if (ageDays > 60 && !status.toLowerCase().includes('done') && !status.toLowerCase().includes('closed')) {
        stats.overdue++;
      }
      
      // Track recent activity
      stats.recent_activity.push({
        key: issue.key,
        summary: issue.fields.summary.substring(0, 100),
        status: status,
        priority: priority,
        age_days: ageDays
      });
    });
    
    // Calculate averages and sort users by workload
    Object.values(userStats).forEach(stats => {
      stats.avg_age_days = stats.issue_ages.length > 0 ? 
        Math.round((stats.issue_ages.reduce((a, b) => a + b, 0) / stats.issue_ages.length) * 100) / 100 : 0;
      stats.recent_activity = stats.recent_activity
        .sort((a, b) => new Date(b.updated) - new Date(a.updated))
        .slice(0, 5);
      delete stats.issue_ages; // Remove raw data
    });
    
    const sortedUsers = Object.values(userStats)
      .sort((a, b) => b.total_assigned - a.total_assigned);
    
    return {
      total_users: sortedUsers.length,
      users: specificUser ? 
        sortedUsers.filter(u => u.name.toLowerCase().includes(specificUser.toLowerCase())) : 
        sortedUsers,
      summary: {
        total_assigned_issues: allAssigned.length,
        total_in_progress: inProgress.length,
        avg_workload: sortedUsers.length > 0 ? 
          Math.round((allAssigned.length / sortedUsers.length) * 100) / 100 : 0
      }
    };
  }

  generateCapacityInsights(users) {
    if (users.length === 0) return {};
    
    const workloads = users.map(u => u.total_assigned);
    const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length;
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    
    return {
      distribution: {
        average_workload: Math.round(avgWorkload * 100) / 100,
        max_workload: maxWorkload,
        min_workload: minWorkload,
        workload_variance: Math.round((maxWorkload - minWorkload) * 100) / 100
      },
      capacity_concerns: {
        overloaded_users: users.filter(u => u.total_assigned > avgWorkload * 1.5),
        underutilized_users: users.filter(u => u.total_assigned < avgWorkload * 0.5),
        users_with_overdue: users.filter(u => u.overdue > 0)
      },
      workload_balance: maxWorkload - minWorkload <= 5 ? 'WELL_BALANCED' : 
                       maxWorkload - minWorkload <= 15 ? 'MODERATE_IMBALANCE' : 'SIGNIFICANT_IMBALANCE'
    };
  }

  generateWorkloadRecommendations(users) {
    const recommendations = [];
    
    if (users.length === 0) {
      return ['No assigned users found in the analyzed scope.'];
    }
    
    const avgWorkload = users.reduce((sum, u) => sum + u.total_assigned, 0) / users.length;
    const overloaded = users.filter(u => u.total_assigned > avgWorkload * 1.5);
    const underutilized = users.filter(u => u.total_assigned < avgWorkload * 0.5 && u.total_assigned > 0);
    const withOverdue = users.filter(u => u.overdue > 0);
    
    if (overloaded.length > 0) {
      recommendations.push(`Consider redistributing work from overloaded users: ${overloaded.map(u => u.name).join(', ')}`);
    }
    
    if (underutilized.length > 0 && overloaded.length > 0) {
      recommendations.push(`Consider assigning more work to underutilized users: ${underutilized.map(u => u.name).join(', ')}`);
    }
    
    if (withOverdue.length > 0) {
      recommendations.push(`Priority review needed for users with overdue issues: ${withOverdue.map(u => `${u.name} (${u.overdue} overdue)`).join(', ')}`);
    }
    
    const highPriorityUsers = users.filter(u => u.critical_priority + u.high_priority > u.total_assigned * 0.5);
    if (highPriorityUsers.length > 0) {
      recommendations.push(`Users handling high percentage of critical/high priority work may need support: ${highPriorityUsers.map(u => u.name).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Workload distribution appears balanced. Continue monitoring for changes.');
    }
    
    return recommendations;
  }

  async getUserWorkload(user, project) {
    try {
      const projectKey = project || this.defaultProject;
      
      // Build JQL based on whether specific user is requested
      let baseJql = `project = ${projectKey} AND assignee is not EMPTY`;
      if (user) {
        // Handle both display name and username
        baseJql = `project = ${projectKey} AND (assignee = "${user}" OR assignee.displayName ~ "${user}")`;
      }
      
      // Get all assigned issues
      const assignedCommand = `jcli issues list --jql "${baseJql}" --max-issues 1000 --output json --summary-len 0`;
      const assignedOutput = await this.executeJCLI(assignedCommand);
      const assignedData = JSON.parse(assignedOutput);
      
      // Get issues in progress
      const inProgressCommand = `jcli issues list --jql "${baseJql} AND status in ('In Progress', 'In Review', 'Testing')" --max-issues 1000 --output json --summary-len 0`;
      const inProgressOutput = await this.executeJCLI(inProgressCommand);
      const inProgressData = JSON.parse(inProgressOutput);
      
      // Analyze workload by user
      const workloadAnalysis = this.analyzeUserWorkload(assignedData.issues || [], inProgressData.issues || [], user);
      
      const userWorkload = {
        project: projectKey,
        analysis_scope: user ? `Specific user: ${user}` : 'All users',
        workload_analysis: workloadAnalysis,
        capacity_insights: this.generateCapacityInsights(workloadAnalysis.users),
        recommendations: this.generateWorkloadRecommendations(workloadAnalysis.users),
        generated_at: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(userWorkload, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing user workload: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  analyzeReleaseReadiness(allIssues, openIssues, blockedIssues, version) {
    const totalIssues = allIssues.length;
    const completedIssues = totalIssues - openIssues.length;
    const completionPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 100;
    
    // Issue categorization
    const priorityBreakdown = {};
    const statusBreakdown = {};
    const componentBreakdown = {};
    const assigneeBreakdown = {};
    
    openIssues.forEach(issue => {
      const priority = issue.fields.priority?.name || 'Undefined';
      const status = issue.fields.status.name;
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const components = issue.fields.components || [];
      
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      assigneeBreakdown[assignee] = (assigneeBreakdown[assignee] || 0) + 1;
      
      components.forEach(comp => {
        componentBreakdown[comp.name] = (componentBreakdown[comp.name] || 0) + 1;
      });
    });
    
    // Risk factors analysis
    const criticalIssues = openIssues.filter(issue => 
      issue.fields.priority?.name?.toLowerCase().includes('critical') ||
      issue.fields.priority?.name?.toLowerCase().includes('blocker')
    );
    
    const unassignedIssues = openIssues.filter(issue => !issue.fields.assignee);
    
    // Testing and QA readiness
    const testingIssues = openIssues.filter(issue => 
      issue.fields.issuetype?.name?.toLowerCase().includes('test') ||
      issue.fields.summary?.toLowerCase().includes('test') ||
      issue.fields.labels?.some(label => label.toLowerCase().includes('test'))
    );
    
    const documentationIssues = openIssues.filter(issue =>
      issue.fields.issuetype?.name?.toLowerCase().includes('doc') ||
      issue.fields.summary?.toLowerCase().includes('doc') ||
      issue.fields.labels?.some(label => label.toLowerCase().includes('doc'))
    );
    
    return {
      completion_metrics: {
        total_issues: totalIssues,
        completed_issues: completedIssues,
        remaining_issues: openIssues.length,
        completion_percentage: completionPercentage,
        blocked_issues: blockedIssues.length
      },
      remaining_work: {
        by_priority: priorityBreakdown,
        by_status: statusBreakdown,
        by_assignee: assigneeBreakdown,
        by_component: componentBreakdown
      },
      risk_factors: {
        critical_open_issues: criticalIssues.length,
        unassigned_issues: unassignedIssues.length,
        blocked_issues: blockedIssues.length,
        testing_issues: testingIssues.length,
        documentation_issues: documentationIssues.length
      },
      critical_issues_details: criticalIssues.slice(0, 10).map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        priority: issue.fields.priority?.name || 'Undefined',
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        status: issue.fields.status.name
      }))
    };
  }

  assessReleaseRisks(analysis) {
    const risks = [];
    let overallRiskLevel = 'LOW';
    
    const completion = analysis.completion_metrics.completion_percentage;
    const criticalCount = analysis.risk_factors.critical_open_issues;
    const blockedCount = analysis.risk_factors.blocked_issues;
    const unassignedCount = analysis.risk_factors.unassigned_issues;
    
    // Completion risk
    if (completion < 50) {
      risks.push({
        category: 'COMPLETION',
        level: 'HIGH',
        description: `Only ${completion}% complete - significant work remaining`
      });
      overallRiskLevel = 'HIGH';
    } else if (completion < 80) {
      risks.push({
        category: 'COMPLETION', 
        level: 'MEDIUM',
        description: `${completion}% complete - moderate work remaining`
      });
      if (overallRiskLevel !== 'HIGH') overallRiskLevel = 'MEDIUM';
    }
    
    // Critical issues risk
    if (criticalCount > 0) {
      risks.push({
        category: 'CRITICAL_ISSUES',
        level: criticalCount > 5 ? 'HIGH' : 'MEDIUM',
        description: `${criticalCount} critical/blocker issues remain open`
      });
      if (criticalCount > 5) overallRiskLevel = 'HIGH';
      else if (overallRiskLevel !== 'HIGH') overallRiskLevel = 'MEDIUM';
    }
    
    // Blocked issues risk
    if (blockedCount > 0) {
      risks.push({
        category: 'BLOCKED_WORK',
        level: blockedCount > 3 ? 'HIGH' : 'MEDIUM',
        description: `${blockedCount} issues are currently blocked`
      });
      if (blockedCount > 3) overallRiskLevel = 'HIGH';
      else if (overallRiskLevel !== 'HIGH') overallRiskLevel = 'MEDIUM';
    }
    
    // Resource allocation risk
    if (unassignedCount > analysis.completion_metrics.remaining_issues * 0.3) {
      risks.push({
        category: 'RESOURCE_ALLOCATION',
        level: 'MEDIUM',
        description: `${unassignedCount} issues unassigned (${Math.round(unassignedCount / analysis.completion_metrics.remaining_issues * 100)}% of remaining work)`
      });
      if (overallRiskLevel !== 'HIGH') overallRiskLevel = 'MEDIUM';
    }
    
    // Testing readiness
    if (analysis.risk_factors.testing_issues > 0) {
      risks.push({
        category: 'QUALITY_ASSURANCE',
        level: 'MEDIUM',
        description: `${analysis.risk_factors.testing_issues} testing-related issues remain open`
      });
    }
    
    return {
      overall_risk_level: overallRiskLevel,
      risk_factors: risks,
      release_readiness_score: this.calculateReadinessScore(analysis)
    };
  }

  calculateReadinessScore(analysis) {
    let score = 100;
    
    // Penalize for incomplete work
    const completionPenalty = (100 - analysis.completion_metrics.completion_percentage) * 0.6;
    score -= completionPenalty;
    
    // Penalize for critical issues
    score -= analysis.risk_factors.critical_open_issues * 10;
    
    // Penalize for blocked issues
    score -= analysis.risk_factors.blocked_issues * 8;
    
    // Penalize for unassigned issues
    const unassignedPercentage = analysis.completion_metrics.remaining_issues > 0 ?
      (analysis.risk_factors.unassigned_issues / analysis.completion_metrics.remaining_issues) * 100 : 0;
    score -= unassignedPercentage * 0.3;
    
    return Math.max(0, Math.round(score));
  }

  generateReleaseRecommendations(analysis) {
    const recommendations = [];
    const risks = this.assessReleaseRisks(analysis);
    
    if (analysis.completion_metrics.completion_percentage < 80) {
      recommendations.push('Consider extending release timeline or reducing scope to ensure quality delivery');
    }
    
    if (analysis.risk_factors.critical_open_issues > 0) {
      recommendations.push(`Prioritize resolution of ${analysis.risk_factors.critical_open_issues} critical/blocker issues before release`);
    }
    
    if (analysis.risk_factors.blocked_issues > 0) {
      recommendations.push(`Address ${analysis.risk_factors.blocked_issues} blocked issues - identify and remove blockers`);
    }
    
    if (analysis.risk_factors.unassigned_issues > analysis.completion_metrics.remaining_issues * 0.2) {
      recommendations.push('Assign remaining issues to team members to ensure accountability and progress tracking');
    }
    
    if (analysis.risk_factors.testing_issues > 0) {
      recommendations.push('Complete testing activities before release to ensure quality standards');
    }
    
    if (analysis.risk_factors.documentation_issues > 0) {
      recommendations.push('Update documentation to support the release and user adoption');
    }
    
    // Component-specific recommendations
    const componentConcerns = Object.entries(analysis.remaining_work.by_component)
      .filter(([_, count]) => count > 5)
      .map(([component, count]) => `${component} (${count} issues)`);
    
    if (componentConcerns.length > 0) {
      recommendations.push(`Focus additional resources on high-impact components: ${componentConcerns.join(', ')}`);
    }
    
    if (risks.overall_risk_level === 'HIGH') {
      recommendations.push('🚨 HIGH RISK RELEASE - Consider postponing until critical issues are resolved');
    } else if (risks.overall_risk_level === 'MEDIUM') {
      recommendations.push('⚠️ MODERATE RISK - Monitor progress closely and address identified risks');
    } else {
      recommendations.push('✅ Release appears ready - continue with planned timeline');
    }
    
    return recommendations;
  }

  async getReleaseReadiness(version, project) {
    try {
      const projectKey = project || this.defaultProject;
      
      // Get all issues for this version/release
      const versionCommand = `jcli issues list --jql "project = ${projectKey} AND fixVersion ~ \\"${version}\\"" --max-issues 1000 --output json --summary-len 0`;
      const versionOutput = await this.executeJCLI(versionCommand);
      const versionData = JSON.parse(versionOutput);
      
      // Get open issues for this version
      const openCommand = `jcli issues list --jql "project = ${projectKey} AND fixVersion ~ \\"${version}\\" AND status not in (Done, Closed, Resolved)" --max-issues 1000 --output json --summary-len 0`;
      const openOutput = await this.executeJCLI(openCommand);
      const openData = JSON.parse(openOutput);
      
      // Get blocked issues
      const blockedCommand = `jcli issues list --jql "project = ${projectKey} AND fixVersion ~ \\"${version}\\" AND (priority = Blocker OR labels in (blocked) OR status = Blocked)" --max-issues 1000 --output json --summary-len 0`;
      const blockedOutput = await this.executeJCLI(blockedCommand);
      const blockedData = JSON.parse(blockedOutput);
      
      const readinessAnalysis = this.analyzeReleaseReadiness(versionData.issues || [], openData.issues || [], blockedData.issues || [], version);
      
      const releaseReadiness = {
        version: version,
        project: projectKey,
        readiness_analysis: readinessAnalysis,
        risk_assessment: this.assessReleaseRisks(readinessAnalysis),
        recommendations: this.generateReleaseRecommendations(readinessAnalysis),
        generated_at: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(releaseReadiness, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing release readiness for ${version}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  analyzeComponentHealth(allIssues, openIssues, recentIssues, specificComponent) {
    const now = new Date();
    
    if (specificComponent) {
      // Analyze a single component
      return this.analyzeSingleComponent(allIssues, openIssues, recentIssues, specificComponent, now);
    } else {
      // Analyze all components
      return this.analyzeAllComponents(allIssues, openIssues, recentIssues, now);
    }
  }

  analyzeSingleComponent(allIssues, openIssues, recentIssues, componentName, now) {
    const totalIssues = allIssues.length;
    const totalOpen = openIssues.length;
    const recentCount = recentIssues.length;
    
    // Priority and severity analysis
    const priorityDistribution = {};
    const severityDistribution = {};
    const assigneeDistribution = {};
    const bugCount = openIssues.filter(issue => 
      issue.fields.issuetype?.name?.toLowerCase().includes('bug')).length;
    
    openIssues.forEach(issue => {
      const priority = issue.fields.priority?.name || 'Undefined';
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const severity = issue.fields.customfield_10000?.value || 'Unknown'; // Assuming severity custom field
      
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;
      severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
      assigneeDistribution[assignee] = (assigneeDistribution[assignee] || 0) + 1;
    });
    
    // Age analysis
    const issueAges = openIssues.map(issue => {
      const created = new Date(issue.fields.created);
      return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    });
    
    const avgAge = issueAges.length > 0 ? issueAges.reduce((a, b) => a + b, 0) / issueAges.length : 0;
    const oldIssues = issueAges.filter(age => age > 60).length;
    
    return {
      component_metrics: {
        total_issues: totalIssues,
        open_issues: totalOpen,
        recent_issues_30_days: recentCount,
        bug_issues: bugCount,
        average_age_days: Math.round(avgAge * 100) / 100,
        stale_issues: oldIssues,
        completion_rate: totalIssues > 0 ? Math.round(((totalIssues - totalOpen) / totalIssues) * 100) : 100
      },
      issue_distribution: {
        by_priority: priorityDistribution,
        by_assignee: assigneeDistribution,
        by_severity: severityDistribution
      },
      health_indicators: {
        defect_ratio: totalIssues > 0 ? Math.round((bugCount / totalIssues) * 100) / 100 : 0,
        maintenance_burden: oldIssues,
        recent_activity_level: recentCount > 5 ? 'HIGH' : recentCount > 2 ? 'MEDIUM' : 'LOW'
      }
    };
  }

  analyzeAllComponents(allIssues, openIssues, recentIssues, now) {
    const componentStats = {};
    
    // Process all issues to build component statistics
    allIssues.forEach(issue => {
      const components = issue.fields.components || [];
      const isOpen = !['Done', 'Closed', 'Resolved'].includes(issue.fields.status.name);
      const isBug = issue.fields.issuetype?.name?.toLowerCase().includes('bug');
      const created = new Date(issue.fields.created);
      const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      const isRecent = ageDays <= 30;
      const isStale = ageDays > 60;
      
      components.forEach(comp => {
        if (!componentStats[comp.name]) {
          componentStats[comp.name] = {
            name: comp.name,
            total: 0,
            open: 0,
            bugs: 0,
            recent: 0,
            stale: 0,
            ages: []
          };
        }
        
        const stats = componentStats[comp.name];
        stats.total++;
        if (isOpen) stats.open++;
        if (isBug) stats.bugs++;
        if (isRecent) stats.recent++;
        if (isStale && isOpen) stats.stale++;
        stats.ages.push(ageDays);
      });
    });
    
    // Calculate health metrics for each component
    const healthyComponents = [];
    const concernComponents = [];
    const criticalComponents = [];
    
    Object.values(componentStats).forEach(stats => {
      const avgAge = stats.ages.length > 0 ? stats.ages.reduce((a, b) => a + b, 0) / stats.ages.length : 0;
      const defectRatio = stats.total > 0 ? stats.bugs / stats.total : 0;
      const staleness = stats.open > 0 ? stats.stale / stats.open : 0;
      
      const component = {
        ...stats,
        avg_age: Math.round(avgAge * 100) / 100,
        defect_ratio: Math.round(defectRatio * 100) / 100,
        staleness_ratio: Math.round(staleness * 100) / 100,
        health_score: this.calculateComponentHealthScore(stats, defectRatio, staleness)
      };
      
      delete component.ages; // Remove raw data
      
      if (component.health_score >= 80) {
        healthyComponents.push(component);
      } else if (component.health_score >= 60) {
        concernComponents.push(component);
      } else {
        criticalComponents.push(component);
      }
    });
    
    return {
      component_summary: {
        total_components: Object.keys(componentStats).length,
        healthy_components: healthyComponents.length,
        components_of_concern: concernComponents.length,
        critical_components: criticalComponents.length
      },
      component_details: {
        healthy: healthyComponents.sort((a, b) => b.health_score - a.health_score),
        concern: concernComponents.sort((a, b) => a.health_score - b.health_score),
        critical: criticalComponents.sort((a, b) => a.health_score - b.health_score)
      }
    };
  }

  calculateComponentHealthScore(stats, defectRatio, staleness) {
    let score = 100;
    
    // Penalize for high defect ratio
    score -= defectRatio * 50;
    
    // Penalize for staleness
    score -= staleness * 40;
    
    // Penalize for too many open issues relative to total
    const openRatio = stats.total > 0 ? stats.open / stats.total : 0;
    score -= openRatio * 30;
    
    // Bonus for recent activity (indicates maintenance)
    if (stats.recent > 0) score += 5;
    
    return Math.max(0, Math.round(score));
  }

  generateComponentTrends(analysis) {
    if (analysis.component_metrics) {
      // Single component analysis
      const metrics = analysis.component_metrics;
      return {
        trend_direction: metrics.recent_issues_30_days > 3 ? 'INCREASING_ACTIVITY' : 
                        metrics.recent_issues_30_days < 1 ? 'LOW_ACTIVITY' : 'STABLE',
        maintenance_trend: metrics.stale_issues > 5 ? 'INCREASING_DEBT' : 'MANAGEABLE',
        quality_trend: metrics.defect_ratio > 0.3 ? 'DECLINING' : 'STABLE'
      };
    } else {
      // Multi-component analysis
      const critical = analysis.component_details.critical.length;
      const concern = analysis.component_details.concern.length;
      const healthy = analysis.component_details.healthy.length;
      const total = critical + concern + healthy;
      
      return {
        overall_health: total > 0 ? (healthy / total) > 0.7 ? 'GOOD' : 
                       (healthy / total) > 0.4 ? 'MODERATE' : 'POOR' : 'NO_DATA',
        risk_distribution: {
          critical_percentage: total > 0 ? Math.round((critical / total) * 100) : 0,
          concern_percentage: total > 0 ? Math.round((concern / total) * 100) : 0,
          healthy_percentage: total > 0 ? Math.round((healthy / total) * 100) : 0
        }
      };
    }
  }

  generateComponentRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.component_metrics) {
      // Single component recommendations
      const metrics = analysis.component_metrics;
      
      if (metrics.stale_issues > 5) {
        recommendations.push(`Address ${metrics.stale_issues} stale issues - consider closing outdated issues or updating status`);
      }
      
      if (metrics.defect_ratio > 0.25) {
        recommendations.push('High bug ratio detected - consider code quality review and additional testing');
      }
      
      if (metrics.completion_rate < 70) {
        recommendations.push('Low completion rate - review backlog prioritization and resource allocation');
      }
      
      if (Object.keys(analysis.issue_distribution.by_assignee).filter(a => a !== 'Unassigned').length < 2) {
        recommendations.push('Consider adding additional team members familiar with this component to reduce bus factor');
      }
      
    } else {
      // Multi-component recommendations
      if (analysis.component_details.critical.length > 0) {
        const criticalNames = analysis.component_details.critical.slice(0, 3).map(c => c.name);
        recommendations.push(`Critical attention needed for components: ${criticalNames.join(', ')}`);
      }
      
      if (analysis.component_details.concern.length > analysis.component_details.healthy.length) {
        recommendations.push('More components need attention than are healthy - consider resource reallocation');
      }
      
      const topDefectComponents = [...analysis.component_details.critical, ...analysis.component_details.concern]
        .filter(c => c.defect_ratio > 0.3)
        .sort((a, b) => b.defect_ratio - a.defect_ratio)
        .slice(0, 3);
        
      if (topDefectComponents.length > 0) {
        recommendations.push(`High bug components need quality review: ${topDefectComponents.map(c => c.name).join(', ')}`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Component health appears good - continue current maintenance practices');
    }
    
    return recommendations;
  }

  async getComponentHealth(component, project) {
    try {
      const projectKey = project || this.defaultProject;
      
      // Build JQL based on whether specific component is requested
      let baseJql = `project = ${projectKey}`;
      if (component) {
        baseJql += ` AND component = "${component}"`;
      }
      
      // Get all issues for component(s)
      const allIssuesCommand = `jcli issues list --jql "${baseJql}" --max-issues 1000 --output json --summary-len 0`;
      const allIssuesOutput = await this.executeJCLI(allIssuesCommand);
      const allIssuesData = JSON.parse(allIssuesOutput);
      
      // Get open issues for component(s)
      const openIssuesCommand = `jcli issues list --jql "${baseJql} AND status not in (Done, Closed, Resolved)" --max-issues 1000 --output json --summary-len 0`;
      const openIssuesOutput = await this.executeJCLI(openIssuesCommand);
      const openIssuesData = JSON.parse(openIssuesOutput);
      
      // Get recent issues (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentIssuesCommand = `jcli issues list --jql "${baseJql} AND created >= '${thirtyDaysAgo.toISOString().split('T')[0]}'" --max-issues 1000 --output json --summary-len 0`;
      const recentIssuesOutput = await this.executeJCLI(recentIssuesCommand);
      const recentIssuesData = JSON.parse(recentIssuesOutput);
      
      const healthAnalysis = this.analyzeComponentHealth(
        allIssuesData.issues || [], 
        openIssuesData.issues || [], 
        recentIssuesData.issues || [],
        component
      );
      
      const componentHealth = {
        component: component || 'All Components',
        project: projectKey,
        health_analysis: healthAnalysis,
        trend_analysis: this.generateComponentTrends(healthAnalysis),
        recommendations: this.generateComponentRecommendations(healthAnalysis),
        generated_at: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(componentHealth, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing component health: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('jiracli-mcp server started successfully');
  }
}

// Start the server
const server = new JiraServer();
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});