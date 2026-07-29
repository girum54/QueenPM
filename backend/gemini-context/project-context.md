# Queen PM Project Context

## Project Overview
Queen PM is a conversational project management tool with AI-monitored channels. It combines chat, task boards, sprints, and AI assistance in a single interface.

## Tech Stack
- **Frontend**: React, TanStack Router, TailwindCSS, Lucide icons
- **Backend**: NestJS, Drizzle ORM, PostgreSQL
- **AI**: Google Gemini API for function calling and task management
- **Auth**: Better Auth
- **Real-time**: Custom SSE events for board sync

## Key Features
1. **Chat Channels**: Team communication with @gemini AI integration
2. **Task Boards**: Kanban-style boards with columns (new, active, staging, deployed)
3. **Sprints**: Time-boxed iterations with deliverables
4. **QueenDJ**: Music playlist management for live calls
5. **Live Calls**: Video conferencing integration with LiveKit

## Database Schema
- Users (with isAi flag for AI users)
- Projects
- Channels (with aiActive flag)
- Sprints (with isActive flag)
- Boards (1-to-1 with sprints)
- Tasks (with priority, column, createdBy, sprintId, projectId)
- Messages (with parentId for threads, taskRef for task references)
- Sprint Deliverables (checklist items)
- Calls & Call Participants

## Current Sprint
Sprint 2 - Live call and music playlist updates

## Commands
- `/createtask <title> p:<priority>` - Create a task
- `/todo <title>` - Alias for /createtask
- `@queen <title>` - Create task via AI
- `@gemini <message>` - Ask AI for help
- `@queendj <command>` - Music playlist commands

## Task Priorities
- low, medium, high, urgent

## Task Columns
- new, active, staging, deployed

## Task Created By
- ui (manual UI), ai (AI autonomous), slash (slash command)
