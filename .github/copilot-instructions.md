# Git Blame VS Code Extension

## Project Overview
A VS Code extension that provides git blame functionality with:
- Hover provider to show who coded each line
- Right-click context menu to view file history
- Ability to apply previous changes

## Development Status
- [x] Created copilot-instructions.md
- [x] Scaffold project structure
- [x] Implement git blame hover provider
- [x] Implement file history command
- [x] Implement apply previous changes
- [x] Compile and test
- [x] Complete documentation

## Features Implemented

### Hover Provider
- Shows author, email, date, commit message, and hash when hovering over any line
- Uses `git blame` command with porcelain format
- Displays information in a formatted markdown hover tooltip

### File History Command
- Right-click context menu command "Git Blame: Show File History"
- Shows last 20 commits that modified the file
- Allows viewing file content at any commit

### Apply Previous Changes
- Right-click context menu command "Git Blame: Apply Previous Changes"
- Browse and select previous versions
- Apply changes with confirmation prompt

## How to Test
1. Press F5 to launch the extension in debug mode
2. Open a file in a Git repository
3. Hover over any line to see blame information
4. Right-click to access File History and Apply Previous Changes commands

