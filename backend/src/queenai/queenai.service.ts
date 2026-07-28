import { Injectable, Inject } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { TasksService } from '../tasks/tasks.service';
import { SprintsService } from '../sprints/sprints.service';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { ChannelsService } from '../channels/channels.service';
import * as schema from '../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.provider';
import { eq } from 'drizzle-orm';

type Db = NodePgDatabase<typeof schema>;

interface TaskContext {
  activeSprint?: any;
  activeDeliverables?: any[];
  teamUsers?: any[];
  currentTasks?: any[];
}

@Injectable()
export class QueenaiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private configService: ConfigService,
    private tasksService: TasksService,
    private sprintsService: SprintsService,
    private projectsService: ProjectsService,
    private usersService: UsersService,
    private channelsService: ChannelsService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    console.log('[Queen AI] Initializing with API key:', apiKey ? 'SET' : 'NOT SET');
    if (!apiKey) {
      console.warn('[Queen AI] GEMINI_API_KEY not configured - Queen AI will not function');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    const modelName = 'gemini-pro';
    console.log('[Queen AI] Using model:', modelName);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  async fetchContext(channelId: string, userId: string): Promise<TaskContext> {
    const channel = await this.channelsService.findOne(channelId);
    if (!channel?.projectId) return {};

    const project = await this.projectsService.findOne(channel.projectId);
    const teamUsers = await this.usersService.findByProject(channel.projectId);

    // Get active sprint
    const sprints = await this.sprintsService.findAllByProject(channel.projectId);
    const activeSprint = sprints.find((s) => s.isActive);

    // Get active deliverables if sprint exists
    let activeDeliverables = [];
    if (activeSprint) {
      activeDeliverables = await this.sprintsService.findDeliverables(activeSprint.id);
    }

    // Get current tasks in sprint
    let currentTasks = [];
    if (activeSprint) {
      currentTasks = await this.tasksService.findAll(channel.projectId, activeSprint.id);
    }

    return {
      activeSprint,
      activeDeliverables,
      teamUsers,
      currentTasks,
    };
  }

  getFunctionTools() {
    return [
      {
        name: 'create_tasks',
        description: 'Create one or multiple tasks for a project. Use this when the user wants to create tasks, break down a module into tasks, or add work items.',
        parameters: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'The task title',
                  },
                  description: {
                    type: 'string',
                    description: 'Detailed description of the task',
                  },
                  priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'urgent'],
                    description: 'Task priority level',
                  },
                  assignedTo: {
                    type: 'string',
                    description: 'Username or handle of the user to assign (e.g., @dan, @sofia)',
                  },
                  sprintId: {
                    type: 'string',
                    description: 'ID of the sprint to assign the task to',
                  },
                  deliverableId: {
                    type: 'string',
                    description: 'ID of the deliverable to link the task to',
                  },
                },
                required: ['title'],
              },
            },
          },
          required: ['tasks'],
        },
      },
      {
        name: 'edit_task',
        description: 'Edit an existing task. Use this when the user wants to update task properties like title, description, priority, assignee, or status.',
        parameters: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to edit',
            },
            title: {
              type: 'string',
              description: 'New task title',
            },
            description: {
              type: 'string',
              description: 'New task description',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'New priority level',
            },
            assignedTo: {
              type: 'string',
              description: 'New assignee username or handle',
            },
            status: {
              type: 'string',
              enum: ['new', 'active', 'staging', 'deployed'],
              description: 'New task status/column',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete an existing task. Use this when the user explicitly wants to remove a task.',
        parameters: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to delete',
            },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'get_task_details',
        description: 'Look up task details by ID or search by keyword. Use this to find tasks before editing them or to provide information to the user.',
        parameters: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to look up',
            },
            searchKeyword: {
              type: 'string',
              description: 'Search keyword to find tasks by title or description',
            },
          },
        },
      },
    ];
  }

  async executeToolCall(toolName: string, args: any, context: TaskContext, actingUserId: string) {
    switch (toolName) {
      case 'create_tasks':
        return await this.handleCreateTasks(args.tasks, context, actingUserId);
      case 'edit_task':
        return await this.handleEditTask(args.taskId, args, context, actingUserId);
      case 'delete_task':
        return await this.handleDeleteTask(args.taskId, actingUserId);
      case 'get_task_details':
        return await this.handleGetTaskDetails(args.taskId, args.searchKeyword, context);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async handleCreateTasks(tasks: any[], context: TaskContext, actingUserId: string) {
    const createdTasks = [];
    const channel = await this.db.query.channels.findFirst({
      where: eq(schema.channels.projectId, context.activeSprint?.projectId || ''),
    });

    for (const taskData of tasks) {
      // Map username to userId
      let assigneeId = null;
      if (taskData.assignedTo) {
        const handle = taskData.assignedTo.replace('@', '');
        const user = context.teamUsers?.find((u) => u.handle === handle);
        if (user) assigneeId = user.id;
      }

      const createDto = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'medium',
        assigneeId,
        projectId: context.activeSprint?.projectId,
        sprintId: taskData.sprintId || context.activeSprint?.id,
        deliverableId: taskData.deliverableId,
        createdBy: 'ai' as const,
        column: 'new' as const,
      };

      const task = await this.tasksService.create(createDto, actingUserId);
      createdTasks.push(task);
    }

    return {
      success: true,
      message: `Created ${createdTasks.length} task${createdTasks.length !== 1 ? 's' : ''}`,
      tasks: createdTasks,
    };
  }

  private async handleEditTask(taskId: string, args: any, context: TaskContext, actingUserId: string) {
    // Map username to userId if provided
    if (args.assignedTo) {
      const handle = args.assignedTo.replace('@', '');
      const user = context.teamUsers?.find((u) => u.handle === handle);
      if (user) args.assigneeId = user.id;
      delete args.assignedTo;
    }

    // Map status to column
    if (args.status) {
      args.column = args.status;
      delete args.status;
    }

    // Remove taskId from args before passing to update
    const { taskId: _, ...fieldsToUpdate } = args;

    const updated = await this.tasksService.update(taskId, fieldsToUpdate, actingUserId);
    return {
      success: true,
      message: `Updated task #${taskId.slice(-6)}`,
      task: updated,
    };
  }

  private async handleDeleteTask(taskId: string, actingUserId: string) {
    await this.tasksService.remove(taskId);
    return {
      success: true,
      message: `Deleted task #${taskId.slice(-6)}`,
    };
  }

  private async handleGetTaskDetails(taskId?: string, searchKeyword?: string, context?: TaskContext) {
    if (taskId) {
      const task = await this.tasksService.findOne(taskId);
      return { task };
    }

    if (searchKeyword) {
      const tasks = context?.currentTasks?.filter(
        (t) => t.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
               (t.description && t.description.toLowerCase().includes(searchKeyword.toLowerCase()))
      );
      return { tasks: tasks || [] };
    }

    return { tasks: context?.currentTasks || [] };
  }

  async processMessage(message: string, context: TaskContext, actingUserId: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Queen AI] Processing message:`, message.substring(0, 50) + '...');
    console.log(`[${timestamp}] [Queen AI] Context:`, {
      hasActiveSprint: !!context.activeSprint,
      hasDeliverables: !!context.activeDeliverables?.length,
      hasTeamUsers: !!context.teamUsers?.length,
      hasCurrentTasks: !!context.currentTasks?.length,
    });

    if (!this.configService.get<string>('GEMINI_API_KEY')) {
      console.error(`[${timestamp}] [Queen AI] GEMINI_API_KEY not configured`);
      return {
        type: 'text',
        content: 'Queen AI is not configured. Please set GEMINI_API_KEY.',
      };
    }

    // Build context prompt
    const contextPrompt = this.buildContextPrompt(context);

    const fullPrompt = `${contextPrompt}\n\nUser message: ${message}`;

    try {
      console.log(`[${timestamp}] [Queen AI] Calling Gemini API with model: gemini-pro`);
      // First try without tools to test API connectivity
      const result = await this.model.generateContent(fullPrompt);

      const text = result.text();
      console.log(`[${timestamp}] [Queen AI] Gemini response received, length:`, text.length);
      return {
        type: 'text',
        content: text,
      };
    } catch (error) {
      console.error(`[${timestamp}] [Queen AI] Error:`, error);
      return {
        type: 'text',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private buildContextPrompt(context: TaskContext): string {
    let prompt = 'You are Queen PM, an AI project management assistant. ';
    
    if (context.activeSprint) {
      prompt += `Current sprint: ${context.activeSprint.name}. `;
    }

    if (context.activeDeliverables && context.activeDeliverables.length > 0) {
      prompt += `Active deliverables: ${context.activeDeliverables.map(d => d.text).join(', ')}. `;
    }

    if (context.teamUsers && context.teamUsers.length > 0) {
      prompt += `Team members: ${context.teamUsers.map(u => u.handle).join(', ')}. `;
    }

    if (context.currentTasks && context.currentTasks.length > 0) {
      prompt += `Current tasks in sprint: ${context.currentTasks.map(t => `#${t.id.slice(-6)}: ${t.title}`).join(', ')}. `;
    }

    prompt += 'Use the available tools to create, edit, or delete tasks based on user requests. ';
    prompt += 'When creating tasks, assign them to the active sprint by default. ';
    prompt += 'For task assignments, use the team member handles (e.g., @dan, @sofia).';

    return prompt;
  }
}
