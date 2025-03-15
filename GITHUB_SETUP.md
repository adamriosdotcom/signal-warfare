# GitHub Setup Instructions

Follow these steps to connect this repository to GitHub:

1. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Repository name: signal-warfare
   - Description: A tactical RF warfare simulation with AI integration
   - Make it Public or Private according to your preference
   - Do NOT initialize with README, .gitignore, or license

2. Connect your local repository to GitHub:
   ```bash
   git remote add origin https://github.com/adamriosdotcom/signal-warfare.git
   git branch -M main
   git push -u origin main
   ```

3. Verify the connection:
   ```bash
   git remote -v
   ```

4. Install GitHub CLI (optional, for easier PR management):
   - macOS: `brew install gh`
   - Then authenticate: `gh auth login`

Once connected, AI assistants will be able to help with git operations using the conventions in CLAUDE.md.