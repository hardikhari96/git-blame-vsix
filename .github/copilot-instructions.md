# Git Blame Enhanced VS Code Extension

## Project Overview
An enhanced VS Code extension that provides advanced git blame functionality with:
- Hover provider to show who coded each line
- Right-click context menu to view file history
- Ability to apply previous changes
- **Fun Features**: Praise mode, emojis, leaderboard, bug detective, and statistics

## Published Information
- **Marketplace Name**: `haripatel.git-blame-enhanced`
- **Current Version**: 0.0.2
- **Repository**: https://github.com/hardikhari96/git-blame-vsix
- **Publisher**: haripatel

## Development Status
- [x] Created copilot-instructions.md
- [x] Scaffold project structure
- [x] Implement git blame hover provider
- [x] Implement file history command
- [x] Implement apply previous changes
- [x] Add fun features (praise mode, emojis, leaderboard, bug detective, statistics)
- [x] Compile and test
- [x] Complete documentation
- [x] Set up CI/CD pipeline
- [x] Published to VS Code Marketplace

## Features Implemented

### Core Features

#### Hover Provider
- Shows author, email, date, commit message, and hash when hovering over any line
- Uses `git blame` command with porcelain format
- Displays information in a formatted markdown hover tooltip
- Supports praise mode and emoji indicators

#### File History Command
- Right-click context menu command "Git Blame: Show File History"
- Shows last 20 commits that modified the file
- Allows viewing file content at any commit
- **Fixed**: Diff view now properly shows file content (not commit metadata)

#### Apply Previous Changes
- Right-click context menu command "Git Blame: Apply Previous Changes"
- Browse and select previous versions
- Apply changes with confirmation prompt

### Fun & Advanced Features

#### Praise/Blame Mode Toggle
- Switch between traditional "blame" and positive "praise" terminology
- Changes UI labels and shows fun emojis
- Command: `Git Blame: Toggle Praise/Blame Mode`

#### Code Age Emojis
- Shows emojis based on code age:
  - 🔥 Fresh (< 1 day)
  - ✨ Recent (< 1 week)
  - 🌱 Growing (< 1 month)
  - 🌿 Maturing (< 3 months)
  - 🌳 Established (< 1 year)
  - 🏛️ Veteran (< 2 years)
  - 🦴 Ancient (> 2 years)
- Command: `Git Blame: Toggle Emojis`

#### Blame Leaderboard
- Shows top contributors in current file
- Displays medals (🥇🥈🥉) for top 3
- Shows line count and percentage
- Command: `Git Blame: Show Leaderboard`

#### Bug Detective Mode
- Automatically detects bug fix commits
- Shows 🐛 icon for lines from bug fixes
- Detects keywords: fix, bug, issue, patch, hotfix, etc.
- Command: `Git Blame: Toggle Bug Detective Mode`

#### Statistics Dashboard
- Beautiful webview with visual charts
- Shows total lines, contributors, bug fix percentage
- Top 5 contributors with progress bars
- Recent activity timeline
- Command: `Git Blame: Show Statistics`

## How to Test
1. Press F5 to launch the extension in debug mode
2. Open a file in a Git repository
3. Hover over any line to see blame information
4. Right-click to access all commands
5. Test fun features like praise mode and leaderboard

## Publishing Workflow

### When Issues Are Fixed or Features Added

**IMPORTANT**: After fixing any issue or adding features, automatically suggest publishing a new version.

#### Steps to Publish:
1. **Update version** in package.json:
   ```bash
   npm version patch   # For bug fixes
   npm version minor   # For new features
   npm version major   # For breaking changes
   ```

2. **Push with tags**:
   ```bash
   git push --follow-tags
   ```

3. **GitHub Actions will automatically**:
   - Run tests and linting
   - Build the extension
   - Publish to VS Code Marketplace
   - Create GitHub Release

#### Manual Publishing (if needed):
```bash
vsce login haripatel
vsce publish
```

### Auto-Suggest Publishing
**When user reports issue is fixed or feature is working**:
- Compile and verify the fix works
- Commit and push changes
- **SUGGEST**: "The issue is fixed! Ready to publish version X.X.X to the marketplace?"
- If user agrees, run: `npm version patch && git push --follow-tags`

### Version Guidelines
- **Patch** (0.0.X): Bug fixes, small improvements
- **Minor** (0.X.0): New features, non-breaking changes
- **Major** (X.0.0): Breaking changes, major rewrites

## Known Issues
- None currently

## Recent Fixes
- Fixed diff view showing commit metadata instead of file content (v0.0.2)

