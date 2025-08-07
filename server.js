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
            name: 'get_board_sprints',
            description: 'Get sprints for a specific board with filtering options',
            inputSchema: {
              type: 'object',
              properties: {
                board_name: {
                  type: 'string',
                  description: 'Name of the board',
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
              required: ['board_name']
            }
          },
          {
            name: 'get_sprint_insights',
            description: 'Get comprehensive insights for current/active sprints including progress analysis',
            inputSchema: {
              type: 'object',
              properties: {
                board_name: {
                  type: 'string',
                  description: 'Name of the board to analyze',
                },
                sprint_name: {
                  type: 'string',
                  description: 'Specific sprint name (optional, defaults to active sprint)',
                }
              },
              required: ['board_name']
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

  async getBoardSprints(boardName, sprintName, showAll = false, includeIssues = true) {
    try {
      let command = `jcli boards sprints "${boardName}" --json`;
      
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
        board_name: boardName,
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
            text: `Error getting board sprints for ${boardName}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getSprintInsights(boardName, sprintName) {
    try {
      // Get current/active sprints
      let command = `jcli boards sprints "${boardName}" --json`;
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
              text: `No sprints found for board ${boardName}${sprintName ? ` with name ${sprintName}` : ''}`
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
              board_name: boardName,
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
            text: `Error getting sprint insights for ${boardName}: ${error.message}`
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