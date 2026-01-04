# Publishing Your Git Blame Extension

## Prerequisites

### 1. Create a Publisher Account
1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft/GitHub account
3. Create a new publisher (this will be your publisher ID)

### 2. Generate a Personal Access Token (PAT)
1. Go to [Azure DevOps](https://dev.azure.com)
2. Click on User Settings (top right) → Personal Access Tokens
3. Create new token with:
   - **Name**: VS Code Extension Publishing
   - **Organization**: All accessible organizations
   - **Scopes**: Custom defined → Marketplace → **Manage**
4. Copy the generated token (you won't see it again!)

### 3. Configure GitHub Secrets
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Create a new repository secret:
   - **Name**: `VSCE_PAT`
   - **Value**: Paste your Personal Access Token from step 2

### 4. Update package.json
Edit `package.json` and replace:
- `"publisher": "your-publisher-name"` with your actual publisher ID
- `"url": "https://github.com/your-username/git-blame"` with your actual repository URL

### 5. (Optional) Add an Icon
- Create a 128x128px PNG icon named `icon.png` in the root directory
- Or remove the `"icon": "icon.png"` line from package.json

## Publishing Workflow

### Automatic Publishing (Recommended)
The GitHub Actions workflow will automatically publish when you create a tag:

```bash
# Update version in package.json first
npm version patch  # or minor, or major

# Push the tag
git push --follow-tags
```

The workflow will:
1. ✅ Build the extension
2. ✅ Run tests
3. ✅ Package the .vsix file
4. ✅ Publish to VS Code Marketplace
5. ✅ Create a GitHub Release with the .vsix file

### Manual Publishing
You can also trigger the workflow manually:
1. Go to Actions tab in GitHub
2. Select "Publish Extension"
3. Click "Run workflow"

### Local Testing Before Publishing
```bash
# Install vsce globally
npm install -g @vscode/vsce

# Package the extension
vsce package

# This creates a .vsix file you can test locally:
# Right-click the .vsix file → Install Extension
```

## Version Updates

```bash
# Patch version (0.0.1 → 0.0.2)
npm version patch

# Minor version (0.0.1 → 0.1.0)
npm version minor

# Major version (0.0.1 → 1.0.0)
npm version major

# Push tags to trigger publishing
git push --follow-tags
```

## Troubleshooting

### "Publisher not found"
- Make sure you've created a publisher on the marketplace
- Update the `publisher` field in package.json

### "Unauthorized"
- Verify your VSCE_PAT secret is set correctly in GitHub
- Make sure the PAT has "Marketplace (Manage)" scope

### "Missing README"
- The workflow will use your README.md automatically

### "Missing icon"
- Either add a 128x128px icon.png file
- Or remove the icon field from package.json

## Links
- [VS Code Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Management](https://marketplace.visualstudio.com/manage)
- [Azure DevOps PAT](https://dev.azure.com)
