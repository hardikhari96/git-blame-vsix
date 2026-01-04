# Git Blame Extension

A powerful VS Code extension that provides comprehensive Git blame functionality directly in your editor.

## Features

### 🔍 Hover to See Blame Information
Hover over any line of code to instantly see:
- **Author** who wrote the line
- **Email** of the author
- **Date** when the change was made
- **Commit message** describing the change
- **Commit hash** for reference

### 📜 View File History
Right-click in any file and select **"Git Blame: Show File History"** to:
- View the last 20 commits that modified the file
- See commit hash, author, date, and message
- Select a commit to view the file contents at that point in time

### ⏪ Apply Previous Changes
Right-click in any file and select **"Git Blame: Apply Previous Changes"** to:
- Browse through previous versions of the file
- Select a commit to restore the file to that state
- Safely revert changes with confirmation prompt

## Usage

### Hover Blame
Simply hover your mouse over any line of code in a Git repository to see the blame information.

### File History
1. Right-click anywhere in the editor
2. Select **"Git Blame: Show File History"**
3. Choose a commit from the list to view that version

### Apply Previous Changes
1. Right-click anywhere in the editor
2. Select **"Git Blame: Apply Previous Changes"**
3. Select a commit from the list
4. Confirm to apply the changes

## Requirements

- Git must be installed and available in your system PATH
- The file must be in a Git repository

## Extension Settings

This extension works out of the box with no configuration required.

## Known Issues

- Large files may take a moment to load blame information
- Only works with files tracked by Git

## Release Notes

### 0.0.1

Initial release:
- Hover provider for git blame information
- Right-click context menu for file history
- Ability to apply previous changes from history

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT
