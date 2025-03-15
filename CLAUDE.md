# Instructions for AI Assistance

This document contains essential information for AI assistants working on this project.

## Git and GitHub Workflow

### Repository Information
- Owner: adamriosdotcom
- Repository: signal-warfare
- Remote URL: git@github.com:adamriosdotcom/signal-warfare.git
- Main branch: main
- Authentication: SSH

### Commit Conventions
- Use conventional commits (type: subject)
- Types: feat, fix, docs, style, refactor, test, chore
- Keep subject under 50 characters
- Use imperative mood (Add feature, not Added feature)
- Example: `feat: add RF propagation visualization`

### Version Control Workflow
- Commit after each individual change to the codebase
- Push to GitHub immediately after each commit
- This ensures every change is tracked and can be easily reverted if needed
- Each commit should represent a single logical change

### Branch Strategy
- Feature branches: `feature/short-description`
- Bug fixes: `fix/short-description`
- Documentation: `docs/short-description`
- Always branch from main

### Pull Request Process
1. Create descriptive PR title
2. Include summary of changes and testing procedure
3. Reference issues when applicable
4. Add Claude signature to PR description

## Development Workflow

### Build Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm run test
```

### Code Conventions
- JavaScript: ES6 syntax
- Class names: PascalCase
- Function/variable names: camelCase
- HTML/CSS: kebab-case
- Indent: 2 spaces
- Line length: 80 characters

## Project Structure
- `/assets` - Static assets (models, sounds, textures)
- `/css` - Styling
- `/js` - JavaScript source code
  - `/core` - Core game engine and ECS
  - `/entities` - Game entity definitions
  - `/rf` - RF propagation models
  - `/ui` - User interface components
- `/docs` - Documentation

## Feature Areas
- 3D visualization (THREE.js)
- RF propagation physics
- Claude AI integration
- Entity-Component-System architecture
- Tactical UI