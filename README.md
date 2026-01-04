# Git Blame Enhanced ✨

A powerful and fun VS Code extension that provides comprehensive Git blame functionality with advanced features, emojis, and visual statistics!

## 🌟 Features

### 🔍 Hover to See Blame Information
Hover over any line of code to instantly see:
- **Author** who wrote the line
- **Email** of the author
- **Date** when the change was made
- **Commit message** describing the change
- **Commit hash** for reference
- **Code Age Emoji** - Visual indicator of how old the code is (🔥 fresh to 🦴 ancient)
- **Bug Detective** - Automatically detects if the line came from a bug fix commit 🐛

### 📊 Inline Blame Annotations
- Shows blame information directly in the editor next to your code
- **Toggle** with `Git Blame: Toggle Inline Annotations`
- Displays author, time ago, and commit summary
- Includes emojis and praise mode indicators

### 📜 View File History
Right-click in any file and select **"Git Blame: Show File History"** to:
- View the last 20 commits that modified the file
- See commit hash, author, date, and message
- **Click any commit** to see a side-by-side diff view
- Compare historical version with current file content

### ⏪ Apply Previous Changes
Right-click in any file and select **"Git Blame: Apply Previous Changes"** to:
- Browse through previous versions of the file
- Select a commit to restore the file to that state
- Safely revert changes with confirmation prompt

### 🎨 Git Blame History Tree View
- Dedicated sidebar view showing commit history
- Click any commit to view diff
- Auto-updates when switching files
- Shows recent 50 commits for the active file

## 🎉 Fun & Advanced Features

### 🌈 Praise/Blame Mode Toggle
Switch between traditional "blame" terminology and positive "praise" mode!

- **Blame Mode** (default): Shows "Blame Information", "Author", etc.
- **Praise Mode**: Shows "Code Authorship", "Crafted by", "Code Champions"
- Adds fun emojis and positive language 💪🎯⚡🚀✨
- **Toggle** with `Git Blame: Toggle Praise/Blame Mode`

### 🎯 Code Age Emojis
Automatically shows emojis based on how old the code is:

- 🔥 **Fresh** (< 1 day) - Hot off the press!
- ✨ **Recent** (< 1 week) - Still shiny
- 🌱 **Growing** (< 1 month) - Taking root
- 🌿 **Maturing** (< 3 months) - Settling in
- 🌳 **Established** (< 1 year) - Well-rooted
- 🏛️ **Veteran** (< 2 years) - Battle-tested
- 🦴 **Ancient** (> 2 years) - Wisdom of the ages

**Toggle** with `Git Blame: Toggle Emojis`

### 🏆 Blame Leaderboard
See who wrote the most code in the current file!

- Shows **Top 10 contributors**
- Displays **medals** for top 3 (🥇🥈🥉)
- Shows **line count and percentage** of file ownership
- Changes to "Code Champions" in praise mode
- **Command**: `Git Blame: Show Leaderboard`

### 🐛 Bug Detective Mode
Automatically detects lines that came from bug fix commits!

- Shows **🐛 icon** for bug fix lines in status bar and annotations
- Detects keywords: `fix`, `bug`, `issue`, `patch`, `hotfix`, `defect`, `error`, etc.
- Highlights bug fixes in hover tooltips
- **Toggle** with `Git Blame: Toggle Bug Detective Mode`

### 📊 Statistics Dashboard
Beautiful visual statistics about your file!

- **Interactive webview** with charts and graphs
- Shows:
  - Total lines in file
  - Number of contributors
  - Bug fix percentage 🐛
  - Top 5 contributors with progress bars
  - Recent activity timeline (last 6 months)
  - Contribution percentages
- Changes to "Code Champions" in praise mode
- **Command**: `Git Blame: Show Statistics`

## 🚀 Usage

### Hover Blame
Simply hover your mouse over any line of code in a Git repository to see the blame information with emojis!

### File History & Diff View
1. Right-click anywhere in the editor
2. Select **"Git Blame: Show File History"**
3. Click any commit to see a **side-by-side diff**:
   - Left: File content at that commit
   - Right: Current file content

### Apply Previous Changes
1. Right-click anywhere in the editor
2. Select **"Git Blame: Apply Previous Changes"**
3. Select a commit from the list
4. Confirm to apply the changes

### Leaderboard
1. Right-click or open Command Palette (Ctrl/Cmd+Shift+P)
2. Run **"Git Blame: Show Leaderboard"**
3. See who wrote the most code!

### Statistics Dashboard
1. Right-click or open Command Palette
2. Run **"Git Blame: Show Statistics"**
3. View beautiful charts and insights

### Toggle Features
- **Praise Mode**: Make blame positive! `Git Blame: Toggle Praise/Blame Mode`
- **Emojis**: Show/hide age emojis `Git Blame: Toggle Emojis`
- **Bug Detective**: Highlight bug fixes `Git Blame: Toggle Bug Detective Mode`
- **Inline Annotations**: Show/hide inline blame `Git Blame: Toggle Inline Annotations`

## 📋 All Commands

Access via right-click menu or Command Palette (Ctrl/Cmd+Shift+P):

- `Git Blame: Show File History` - View commit history with diff
- `Git Blame: Apply Previous Changes` - Restore previous version
- `Git Blame: Toggle Inline Annotations` - Show/hide inline blame
- `Git Blame: Toggle Praise/Blame Mode` - Switch to positive terminology
- `Git Blame: Show Leaderboard` - See top contributors
- `Git Blame: Toggle Emojis` - Enable/disable age emojis
- `Git Blame: Toggle Bug Detective Mode` - Highlight bug fixes
- `Git Blame: Show Statistics` - View visual dashboard

## 💡 Requirements

- **Git** must be installed and available in your system PATH
- Files must be in a Git repository
- Works on Windows, macOS, and Linux

## ⚙️ Extension Settings

This extension works out of the box with **no configuration required**! 

All features can be toggled on/off via commands as needed.

## 🎨 Screenshots

### Hover with Emojis
![Hover tooltip showing blame info with code age emoji and bug detective icon]

### Leaderboard
![Top contributors with medals and percentages]

### Statistics Dashboard
![Beautiful webview with charts showing contributor stats]

### Praise Mode
![Positive terminology and fun emojis]

## 🐛 Known Issues

- Large files may take a moment to load blame information
- Only works with files tracked by Git
- Emojis require a font that supports Unicode emoji

## 📝 Release Notes

### 0.0.3
- **Fixed**: Diff view now properly shows file content instead of commit metadata
- Improved URI handling for historical file versions

### 0.0.2
- **New**: Praise/Blame mode toggle for positive vibes
- **New**: Code age emojis (🔥 to 🦴)
- **New**: Blame leaderboard with medals
- **New**: Bug detective mode
- **New**: Statistics dashboard with charts
- Enhanced hover tooltips with fun features

### 0.0.1
Initial release:
- Hover provider for git blame information
- Right-click context menu for file history
- Ability to apply previous changes from history
- Git Blame History tree view

## 🤝 Contributing

Feel free to submit issues and enhancement requests on [GitHub](https://github.com/hardikhari96/git-blame-vsix)!

## 📄 License

MIT

---

**Enjoy!** 🎉 If you like this extension, please give it a ⭐ on the marketplace!
