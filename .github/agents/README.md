# Custom GitHub Copilot Agents

This directory contains custom agent configurations for GitHub Copilot.

## Available Agents

### nestjs-expert
Expert in NestJS, TypeScript, and scalable backend API development following project-specific best practices.

**File:** `nestjs-expert.agent.md`
**Target:** `github-copilot` and `vscode`
**Specialties:**
- NestJS framework and patterns
- Multi-tenant architecture 
- JWT authentication and authorization
- PostgreSQL database integration
- Testing strategies (unit/integration)
- Supabase integration

## Usage

These agents can be used in:
- GitHub Copilot Chat in VS Code
- GitHub Copilot CLI
- GitHub Mission Control (web)

To use an agent, reference it with `@agent-name` in your chat or assign issues directly to the agent.