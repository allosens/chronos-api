# GitHub Copilot Configuration

This repository is configured to use GitHub Copilot with custom agents.

## Custom Agents

- **nestjs-expert**: Specialized in NestJS, TypeScript, and multi-tenant backend development

## Usage

### In GitHub Web Interface
1. Go to any issue
2. Click on "Assign" 
3. Look for "GitHub Copilot" or custom agents in the assignee list

### In VS Code
1. Open Copilot Chat (Ctrl+Shift+I)
2. Use `@nestjs-expert` to invoke the custom agent
3. Or select from the agent dropdown

### GitHub CLI
```bash
gh copilot suggest "implement authentication system" --agent nestjs-expert
```

## Repository Settings

Make sure GitHub Copilot is enabled in repository settings:
1. Go to Settings → General → Features
2. Enable "GitHub Copilot"
3. Configure agent permissions if needed