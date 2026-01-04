import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';

const execPromise = util.promisify(cp.exec);

interface BlameInfo {
	author: string;
	authorMail: string;
	authorTime: string;
	committer: string;
	committerTime: string;
	summary: string;
	hash: string;
}

interface FileHistory {
	hash: string;
	author: string;
	date: string;
	message: string;
	changes: string;
}

interface CommitItem {
	hash: string;
	author: string;
	date: string;
	message: string;
	filePath: string;
}

const LOG_FIELD_SEPARATOR = '\u001f';
const LOG_RECORD_SEPARATOR = '\u001e';

let currentFileUri: vscode.Uri | undefined;
let blameDecorationType: vscode.TextEditorDecorationType;
let statusBarItem: vscode.StatusBarItem;
let blameAnnotationsEnabled = true;
let currentGitUser: string | undefined;
let gitUserWorkspace: string | undefined;
let blameUpdateTimeout: NodeJS.Timeout | undefined;
let praiseMode = false; // Toggle between 'blame' and 'praise' mode
let showEmojis = true; // Show emojis in annotations
let bugDetectiveMode = false; // Highlight bug fix lines

export async function activate(context: vscode.ExtensionContext) {
	console.log('Git Blame extension is now active!');

	// Create decoration type for blame annotations
	blameDecorationType = vscode.window.createTextEditorDecorationType({
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
		after: {
			color: new vscode.ThemeColor('editorCodeLens.foreground'),
			margin: '0 0 0 1.5rem',
			fontStyle: 'italic',
			textDecoration: 'none'
		}
	});

	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);

	// Register hover provider for git blame
	const hoverProvider = vscode.languages.registerHoverProvider(
		{ scheme: 'file' },
		new GitBlameHoverProvider()
	);

	// Create history tree view provider
	const historyProvider = new GitHistoryProvider();
	const treeView = vscode.window.createTreeView('gitBlameHistory', {
		treeDataProvider: historyProvider,
		showCollapseAll: true
	});

	// Register command to show file history
	const fileHistoryCommand = vscode.commands.registerCommand(
		'git-blame.showFileHistory',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}
			await showFileHistory(editor.document.uri);
		}
	);

	// Register command to refresh history view
	const refreshHistoryCommand = vscode.commands.registerCommand(
		'git-blame.refreshHistory',
		() => {
			if (vscode.window.activeTextEditor) {
				currentFileUri = vscode.window.activeTextEditor.document.uri;
				historyProvider.refresh();
			}
		}
	);

	// Register command to show diff
	const showDiffCommand = vscode.commands.registerCommand(
		'git-blame.showDiff',
		async (item: HistoryItem) => {
			await showCommitDiff(item);
		}
	);

	// Register command to apply previous changes
	const applyChangesCommand = vscode.commands.registerCommand(
		'git-blame.applyPreviousChanges',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}
			await applyPreviousChanges(editor.document.uri);
		}
	);

	// Register command to toggle blame annotations
	const toggleBlameCommand = vscode.commands.registerCommand(
		'git-blame.toggleBlameAnnotations',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				blameAnnotationsEnabled = !blameAnnotationsEnabled;
				if (blameAnnotationsEnabled) {
					await updateBlameAnnotations(editor, editor.selection.active);
					vscode.window.showInformationMessage('Git blame annotations enabled');
				} else {
					editor.setDecorations(blameDecorationType, []);
					vscode.window.showInformationMessage('Git blame annotations disabled');
				}
			}
		}
	);

	// Register command to toggle praise mode
	const togglePraiseModeCommand = vscode.commands.registerCommand(
		'git-blame.togglePraiseMode',
		async () => {
			praiseMode = !praiseMode;
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				await updateCurrentLineBlame(editor, editor.selection.active);
				if (blameAnnotationsEnabled) {
					await updateBlameAnnotations(editor, editor.selection.active);
				}
			}
			const mode = praiseMode ? '🎉 Praise' : '👀 Blame';
			vscode.window.showInformationMessage(`${mode} mode activated!`);
		}
	);

	// Register command to show blame leaderboard
	const showLeaderboardCommand = vscode.commands.registerCommand(
		'git-blame.showLeaderboard',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}
			await showBlameLeaderboard(editor);
		}
	);

	// Register command to toggle emoji mode
	const toggleEmojiCommand = vscode.commands.registerCommand(
		'git-blame.toggleEmojis',
		async () => {
			showEmojis = !showEmojis;
			const editor = vscode.window.activeTextEditor;
			if (editor && blameAnnotationsEnabled) {
				await updateBlameAnnotations(editor, editor.selection.active);
			}
			const status = showEmojis ? 'enabled 😊' : 'disabled';
			vscode.window.showInformationMessage(`Emojis ${status}`);
		}
	);

	// Register command to toggle bug detective mode
	const toggleBugDetectiveCommand = vscode.commands.registerCommand(
		'git-blame.toggleBugDetective',
		async () => {
			bugDetectiveMode = !bugDetectiveMode;
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				await updateCurrentLineBlame(editor, editor.selection.active);
			}
			const status = bugDetectiveMode ? '🔍 Bug Detective mode ON' : 'Bug Detective mode OFF';
			vscode.window.showInformationMessage(status);
		}
	);

	// Register command to show statistics
	const showStatsCommand = vscode.commands.registerCommand(
		'git-blame.showStatistics',
		async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showErrorMessage('No active editor');
				return;
			}
			await showBlameStatistics(context, editor);
		}
	);

	// Update blame annotations when cursor moves
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection(async (e) => {
			if (e.textEditor === vscode.window.activeTextEditor) {
				const activePosition = e.selections[0]?.active;
				if (activePosition) {
					await updateCurrentLineBlame(e.textEditor, activePosition);
					if (blameAnnotationsEnabled) {
						await updateBlameAnnotations(e.textEditor, activePosition);
					}
				}
			}
		})
	);

	// Update history view and blame when active editor changes
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (editor) {
				currentFileUri = editor.document.uri;
				historyProvider.refresh();
				const activePosition = editor.selection.active;
				await updateCurrentLineBlame(editor, activePosition);
				if (blameAnnotationsEnabled) {
					await updateBlameAnnotations(editor, activePosition);
				}
			}
		})
	);

	// Update blame annotations when document changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(async (e) => {
			const editor = vscode.window.activeTextEditor;
			if (editor && e.document === editor.document && blameAnnotationsEnabled) {
				if (blameUpdateTimeout) {
					clearTimeout(blameUpdateTimeout);
				}
				blameUpdateTimeout = setTimeout(async () => {
					if (blameAnnotationsEnabled && vscode.window.activeTextEditor === editor && !editor.document.isClosed) {
						await updateBlameAnnotations(editor, editor.selection.active);
					}
				}, 500);
			}
		})
	);

	// Initial update for current editor
	if (vscode.window.activeTextEditor) {
		currentFileUri = vscode.window.activeTextEditor.document.uri;
		historyProvider.refresh();
		await updateCurrentLineBlame(vscode.window.activeTextEditor, vscode.window.activeTextEditor.selection.active);
		if (blameAnnotationsEnabled) {
			await updateBlameAnnotations(vscode.window.activeTextEditor, vscode.window.activeTextEditor.selection.active);
		}
	}

	context.subscriptions.push(
		hoverProvider,
		fileHistoryCommand,
		applyChangesCommand,
		refreshHistoryCommand,
		showDiffCommand,
		toggleBlameCommand,
		togglePraiseModeCommand,
		showLeaderboardCommand,
		toggleEmojiCommand,
		toggleBugDetectiveCommand,
		showStatsCommand,
		treeView,
		blameDecorationType
	);
}

class GitBlameHoverProvider implements vscode.HoverProvider {
	async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): Promise<vscode.Hover | undefined> {
		try {
			const lineNumber = position.line + 1; // Git uses 1-based line numbers
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
			
			if (!workspaceFolder) {
				return undefined;
			}

			const relativePath = vscode.workspace.asRelativePath(document.uri);
			const blameInfo = await getBlameForLine(workspaceFolder.uri.fsPath, relativePath, lineNumber);

			if (!blameInfo) {
				return undefined;
			}

			const date = new Date(parseInt(blameInfo.authorTime) * 1000);
			const formattedDate = date.toLocaleString();
			const isBugFix = isBugFixCommit(blameInfo.summary);
			const ageEmoji = getAgeEmoji(date);

			const markdownString = new vscode.MarkdownString();
			const header = praiseMode ? '**🌟 Code Authorship**' : '**Blame Information**';
			markdownString.appendMarkdown(`${header}\n\n`);
			
			if (showEmojis) {
				markdownString.appendMarkdown(`${ageEmoji} `);
			}
			
			if (praiseMode) {
				markdownString.appendMarkdown(`Crafted by: **${blameInfo.author}** ${getFunPraise()}\n\n`);
			} else {
				markdownString.appendMarkdown(`Author: ${blameInfo.author}\n\n`);
			}
			
			if (blameInfo.authorMail) {
				markdownString.appendMarkdown(`Email: ${blameInfo.authorMail}\n\n`);
			}
			markdownString.appendMarkdown(`Date: ${formattedDate}\n\n`);
			
			if (isBugFix && bugDetectiveMode) {
				markdownString.appendMarkdown(`🐛 **Bug Fix Detected!**\n\n`);
			}
			
			markdownString.appendMarkdown(`Summary: ${blameInfo.summary}\n\n`);
			markdownString.appendMarkdown(`Commit: \`${blameInfo.hash.substring(0, 8)}\``);

			return new vscode.Hover(markdownString);
		} catch (error) {
			console.error('Error in provideHover:', error);
			return undefined;
		}
	}
}

async function getBlameForLine(
	workspaceFolder: string,
	filePath: string,
	lineNumber: number
): Promise<BlameInfo | undefined> {
	try {
		const command = `git blame -L ${lineNumber},${lineNumber} --porcelain "${filePath}"`;
		const { stdout } = await execPromise(command, { cwd: workspaceFolder });

		const lines = stdout.split('\n');
		const blameInfo: Partial<BlameInfo> = {};

		if (lines.length > 0) {
			const headerParts = lines[0].split(' ');
			if (headerParts.length > 0) {
				blameInfo.hash = sanitizeHash(headerParts[0]);
			}
		}

		for (const line of lines) {
			if (!blameInfo.hash) {
				const headerMatch = line.match(/^([^\s]+)\s+/);
				if (headerMatch) {
					blameInfo.hash = sanitizeHash(headerMatch[1]);
					continue;
				}
			}
			if (line.startsWith('author ') && !line.startsWith('author-')) {
				blameInfo.author = line.substring(7);
			} else if (line.startsWith('author-mail ')) {
				blameInfo.authorMail = line.substring(12).replace(/[<>]/g, '');
			} else if (line.startsWith('author-time ')) {
				blameInfo.authorTime = line.substring(12);
			} else if (line.startsWith('committer ') && !line.startsWith('committer-')) {
				blameInfo.committer = line.substring(10);
			} else if (line.startsWith('committer-time ')) {
				blameInfo.committerTime = line.substring(15);
			} else if (line.startsWith('summary ')) {
				blameInfo.summary = line.substring(8);
			}
		}

		if (!blameInfo.hash) {
			blameInfo.hash = '';
		}

		return blameInfo as BlameInfo;
	} catch (error) {
		console.error('Error getting blame:', error);
		return undefined;
	}
}

async function showFileHistory(uri: vscode.Uri) {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('File is not in a workspace');
			return;
		}

		const relativePath = vscode.workspace.asRelativePath(uri);
		const prettyFormat = `%H${LOG_FIELD_SEPARATOR}%an${LOG_FIELD_SEPARATOR}%ad${LOG_FIELD_SEPARATOR}%s${LOG_RECORD_SEPARATOR}`;
		const command = `git log --follow --pretty=format:"${prettyFormat}" --date=short -n 20 -- "${relativePath}"`;
		const { stdout } = await execPromise(command, { cwd: workspaceFolder.uri.fsPath });

		if (!stdout) {
			vscode.window.showInformationMessage('No history found for this file');
			return;
		}

		const commits = parseGitLog(stdout);
		if (commits.length === 0) {
			vscode.window.showInformationMessage('No history found for this file');
			return;
		}
		if (commits.length === 0) {
			vscode.window.showInformationMessage('No history found for this file');
			return;
		}

		const selected = await vscode.window.showQuickPick(
			commits.map(c => ({
				label: `$(git-commit) ${c.hash.substring(0, 8)}`,
				description: c.message,
				detail: `${c.author} - ${c.date}`,
				commit: c
			})),
			{
				placeHolder: 'Select a commit to view changes',
				matchOnDescription: true,
				matchOnDetail: true
			}
		);

		if (selected) {
			const historyItem = new HistoryItem(
				selected.commit.message,
				selected.commit.hash,
				selected.commit.author,
				selected.commit.date,
				relativePath,
				workspaceFolder.uri.fsPath
			);
			await showCommitDiff(historyItem);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Error getting file history: ${error}`);
	}
}

async function applyPreviousChanges(uri: vscode.Uri) {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('File is not in a workspace');
			return;
		}

		const relativePath = vscode.workspace.asRelativePath(uri);
		const prettyFormat = `%H${LOG_FIELD_SEPARATOR}%an${LOG_FIELD_SEPARATOR}%ad${LOG_FIELD_SEPARATOR}%s${LOG_RECORD_SEPARATOR}`;
		const command = `git log --follow --pretty=format:"${prettyFormat}" --date=short -n 20 -- "${relativePath}"`;
		const { stdout } = await execPromise(command, { cwd: workspaceFolder.uri.fsPath });

		if (!stdout) {
			vscode.window.showInformationMessage('No history found for this file');
			return;
		}

		const commits = parseGitLog(stdout);

		const selected = await vscode.window.showQuickPick(
			commits.map(c => ({
				label: `$(git-commit) ${c.hash.substring(0, 8)}`,
				description: c.message,
				detail: `${c.author} - ${c.date}`,
				commit: c
			})),
			{
				placeHolder: 'Select a commit to apply',
				matchOnDescription: true,
				matchOnDetail: true
			}
		);

		if (!selected) {
			return;
		}

		const confirm = await vscode.window.showWarningMessage(
			`Apply changes from commit ${selected.commit.hash.substring(0, 8)}? This will replace the current file content.`,
			'Apply',
			'Cancel'
		);

		if (confirm === 'Apply') {
			const gitRelativePath = toGitPath(relativePath);
			const getFileCommand = `git show ${selected.commit.hash}:"${gitRelativePath}"`;
			const { stdout: fileContent } = await execPromise(getFileCommand, { cwd: workspaceFolder.uri.fsPath });

			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.uri.toString() === uri.toString()) {
				const edit = new vscode.WorkspaceEdit();
				const fullRange = new vscode.Range(
					editor.document.positionAt(0),
					editor.document.positionAt(editor.document.getText().length)
				);
				edit.replace(uri, fullRange, fileContent);
				await vscode.workspace.applyEdit(edit);
				vscode.window.showInformationMessage('Previous changes applied successfully');
			}
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Error applying previous changes: ${error}`);
	}
}

// Git History Tree View Provider
class GitHistoryProvider implements vscode.TreeDataProvider<HistoryItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined | null | void> = new vscode.EventEmitter<HistoryItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: HistoryItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: HistoryItem): Promise<HistoryItem[]> {
		if (!currentFileUri) {
			return [];
		}

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentFileUri);
		if (!workspaceFolder) {
			return [];
		}

		try {
			const relativePath = vscode.workspace.asRelativePath(currentFileUri);
			const prettyFormat = `%H${LOG_FIELD_SEPARATOR}%an${LOG_FIELD_SEPARATOR}%ad${LOG_FIELD_SEPARATOR}%s${LOG_RECORD_SEPARATOR}`;
			const command = `git log --follow --pretty=format:"${prettyFormat}" --date=short -n 50 -- "${relativePath}"`;
			const { stdout } = await execPromise(command, { cwd: workspaceFolder.uri.fsPath });

			if (!stdout) {
				return [];
			}

			return parseGitLog(stdout).map(entry =>
				new HistoryItem(
					entry.message || 'No message',
					entry.hash,
					entry.author,
					entry.date,
					relativePath,
					workspaceFolder.uri.fsPath
				)
			);
		} catch (error) {
			console.error('Error getting history:', error);
			return [];
		}
	}
}

class HistoryItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly hash: string,
		public readonly author: string,
		public readonly date: string,
		public readonly filePath: string,
		public readonly workspaceFolder: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = `${this.label}\n\nCommit: ${hash.substring(0, 8)}\nAuthor: ${author}\nDate: ${date}`;
		this.description = `${author} - ${date}`;
		this.iconPath = new vscode.ThemeIcon('git-commit');
		this.contextValue = 'historyItem';
		this.command = {
			command: 'git-blame.showDiff',
			title: 'Show Diff',
			arguments: [this]
		};
	}
}

async function showCommitDiff(item: HistoryItem) {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentFileUri!);
		if (!workspaceFolder) {
			return;
		}

		// Get the file content at the selected commit
		const gitRelativePath = toGitPath(item.filePath);
		const { stdout: commitContent } = await execPromise(`git show ${item.hash}:"${gitRelativePath}"`, { 
			cwd: item.workspaceFolder 
		});

		// Create URI for the historical version
		const fileName = path.basename(item.filePath);
		const historicalUri = vscode.Uri.parse(`git-blame-commit://${item.hash}/${item.filePath}`);

		// Register text document content provider for historical version
		const commitProvider = new (class implements vscode.TextDocumentContentProvider {
			provideTextDocumentContent(uri: vscode.Uri): string {
				return commitContent;
			}
		})();

		const disposable = vscode.workspace.registerTextDocumentContentProvider('git-blame-commit', commitProvider);

		// Get the current file URI
		const currentUri = currentFileUri!;

		// Show diff: historical commit (left) vs current file (right)
		await vscode.commands.executeCommand(
			'vscode.diff',
			historicalUri,
			currentUri,
			`${fileName} (${item.hash.substring(0, 8)}) ↔ ${fileName} (Current)`
		);

		// Clean up provider after a longer delay to ensure diff is loaded
		setTimeout(() => {
			disposable.dispose();
		}, 5000);

	} catch (error) {
		vscode.window.showErrorMessage(`Error showing diff: ${error}`);
	}
}

async function updateCurrentLineBlame(editor: vscode.TextEditor, position: vscode.Position) {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
		if (!workspaceFolder) {
			statusBarItem.hide();
			return;
		}

		const lineNumber = position.line + 1;
		const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
		const blameInfo = await getBlameForLine(workspaceFolder.uri.fsPath, relativePath, lineNumber);
		await ensureGitUser(workspaceFolder.uri.fsPath);

		if (blameInfo) {
			const date = new Date(parseInt(blameInfo.authorTime) * 1000);
			const timeAgo = getTimeAgo(date);
			const isUncommittedLine = isUncommitted(blameInfo.author, blameInfo.hash);
			const displayAuthor = getDisplayAuthor(blameInfo.author);
			const hoverAuthor = getHoverAuthor(blameInfo.author);
			const summaryText = getSummaryText(blameInfo.summary);
			const shortHash = isUncommittedLine ? 'Working Tree' : (blameInfo.hash ? blameInfo.hash.substring(0, 7) : '');
			const email = getValidEmail(blameInfo.authorMail);
			const isBugFix = isBugFixCommit(blameInfo.summary);
			const bugIcon = (bugDetectiveMode && isBugFix) ? '🐛 ' : '';
			const ageEmoji = showEmojis ? getAgeEmoji(date) + ' ' : '';

			statusBarItem.text = `${bugIcon}${ageEmoji}$(person) ${displayAuthor} - $(calendar) ${timeAgo} - $(git-commit) ${shortHash}`;
			statusBarItem.tooltip = `${praiseMode ? '🌟 ' : ''}Author: ${hoverAuthor}${email ? `\nEmail: ${email}` : ''}\nSummary: ${summaryText}\n\nCommit: ${shortHash}\nDate: ${date.toLocaleString()}`;
			statusBarItem.show();
		} else {
			statusBarItem.hide();
		}
	} catch (error) {
		statusBarItem.hide();
	}
}

async function updateBlameAnnotations(editor: vscode.TextEditor, position?: vscode.Position) {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
	if (!workspaceFolder) {
		editor.setDecorations(blameDecorationType, []);
		return;
	}

	const targetPosition = position ?? editor.selection.active;
	if (!targetPosition) {
		editor.setDecorations(blameDecorationType, []);
		return;
	}

	try {
		await ensureGitUser(workspaceFolder.uri.fsPath);

		const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
		const lineNumber = targetPosition.line + 1;
		const blameInfo = await getBlameForLine(workspaceFolder.uri.fsPath, relativePath, lineNumber);

		if (!blameInfo || !blameInfo.authorTime) {
			editor.setDecorations(blameDecorationType, []);
			return;
		}

		const date = new Date(parseInt(blameInfo.authorTime) * 1000);
		const timeAgo = getTimeAgo(date);
		const isUncommittedLine = isUncommitted(blameInfo.author, blameInfo.hash);
		const displayAuthor = getDisplayAuthor(blameInfo.author);
		const summaryText = getSummaryText(blameInfo.summary);
		const isBugFix = isBugFixCommit(blameInfo.summary);
		const ageEmoji = showEmojis ? getAgeEmoji(date) + ' ' : '';
		const bugIcon = (bugDetectiveMode && isBugFix) ? '🐛 ' : '';
		const prefix = praiseMode ? '👏 ' : '';
		const annotation = ` ${prefix}${bugIcon}${ageEmoji}${displayAuthor} (${timeAgo}) - ${truncateSummary(summaryText)}`;

		const documentLine = editor.document.lineAt(targetPosition.line);
		const lineEnd = documentLine.range.end.character;
		const range = new vscode.Range(
			new vscode.Position(targetPosition.line, lineEnd),
			new vscode.Position(targetPosition.line, lineEnd)
		);

		editor.setDecorations(blameDecorationType, [
			{
				range,
				renderOptions: {
					after: {
						contentText: annotation,
						color: new vscode.ThemeColor('editorCodeLens.foreground'),
						fontStyle: 'italic'
					}
				}
			}
		]);
	} catch (error) {
		editor.setDecorations(blameDecorationType, []);
		console.error('Error updating blame annotations:', error);
	}
}

		async function ensureGitUser(workspaceFolder: string): Promise<void> {
			if (gitUserWorkspace === workspaceFolder && currentGitUser !== undefined) {
				return;
			}

			try {
				const { stdout } = await execPromise('git config user.name', { cwd: workspaceFolder });
				currentGitUser = stdout.trim() || undefined;
			} catch (error) {
				currentGitUser = undefined;
			}

			gitUserWorkspace = workspaceFolder;
		}

		function isUncommitted(author?: string, hash?: string): boolean {
			return author === 'Not Committed Yet' || (hash ? /^0+$/.test(hash) : false);
		}

		function getDisplayAuthor(author?: string): string {
			if (isUncommitted(author)) {
				return currentGitUser || 'You';
			}
			if (author && currentGitUser && author === currentGitUser) {
				return 'You';
			}
			return author || 'Unknown';
		}

		function getHoverAuthor(author?: string): string {
			if (isUncommitted(author)) {
				return currentGitUser ? `${currentGitUser} (uncommitted)` : 'Uncommitted changes';
			}
			return author || 'Unknown';
		}

		function getSummaryText(summary?: string): string {
			if (!summary) {
				return 'No commit message';
			}
			if (/not committed yet/i.test(summary)) {
				return 'Uncommitted changes';
			}
			return summary;
		}

		function truncateSummary(summary: string, maxLength = 60): string {
			if (summary.length <= maxLength) {
				return summary;
			}
			return `${summary.slice(0, maxLength - 3)}...`;
		}

		function getValidEmail(email?: string): string | undefined {
			if (!email || /not\.committed\.yet/i.test(email)) {
				return undefined;
			}
			return email;
		}

	function parseGitLog(output: string): Array<{ hash: string; author: string; date: string; message: string }> {
		return output
			.split(LOG_RECORD_SEPARATOR)
			.map(entry => {
				const [hash = '', author = '', date = '', message = ''] = entry.split(LOG_FIELD_SEPARATOR);
				if (!hash) {
					return undefined;
				}
				return { hash, author, date, message };
			})
			.filter((entry): entry is { hash: string; author: string; date: string; message: string } => Boolean(entry));
}

	function toGitPath(filePath: string): string {
		return filePath.replace(/\\/g, '/');
	}

function sanitizeHash(rawHash?: string): string | undefined {
	if (!rawHash) {
		return undefined;
	}
	return rawHash.startsWith('^') ? rawHash.substring(1) : rawHash;
}

function getTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	
	const intervals: { [key: string]: number } = {
		year: 31536000,
		month: 2592000,
		week: 604800,
		day: 86400,
		hour: 3600,
		minute: 60
	};
	
	for (const [name, secondsInInterval] of Object.entries(intervals)) {
		const interval = Math.floor(seconds / secondsInInterval);
		if (interval >= 1) {
			return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
		}
	}
	
	return 'just now';
}

function getAgeEmoji(date: Date): string {
	const daysSinceCommit = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
	
	if (daysSinceCommit < 1) {
		return '🔥'; // Fresh code!
	} else if (daysSinceCommit < 7) {
		return '✨'; // Recent
	} else if (daysSinceCommit < 30) {
		return '🌱'; // Growing
	} else if (daysSinceCommit < 90) {
		return '🌿'; // Maturing
	} else if (daysSinceCommit < 365) {
		return '🌳'; // Established
	} else if (daysSinceCommit < 730) {
		return '🏛️'; // Veteran
	} else {
		return '🦴'; // Ancient wisdom
	}
}

function isBugFixCommit(summary?: string): boolean {
	if (!summary) {
		return false;
	}
	const bugKeywords = /\b(fix|bug|issue|patch|hotfix|defect|error|crash|regression)\b/i;
	return bugKeywords.test(summary);
}

function getFunPraise(): string {
	const praises = [
		'💪',
		'🎯',
		'⚡',
		'🚀',
		'🌟',
		'✨',
		'🎨',
		'👑',
		'🏆'
	];
	return praises[Math.floor(Math.random() * praises.length)];
}

async function showBlameLeaderboard(editor: vscode.TextEditor) {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('File is not in a workspace');
			return;
		}

		const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
		const command = `git blame --line-porcelain "${relativePath}"`;
		const { stdout } = await execPromise(command, { cwd: workspaceFolder.uri.fsPath });

		const authorLines = new Map<string, number>();
		const lines = stdout.split('\n');
		
		for (const line of lines) {
			if (line.startsWith('author ') && !line.startsWith('author-')) {
				const author = line.substring(7);
				authorLines.set(author, (authorLines.get(author) || 0) + 1);
			}
		}

		const sorted = Array.from(authorLines.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

		const totalLines = editor.document.lineCount;
		const medals = ['🥇', '🥈', '🥉'];
		
		const items = sorted.map((entry, index) => {
			const [author, lines] = entry;
			const percentage = ((lines / totalLines) * 100).toFixed(1);
			const medal = index < 3 ? medals[index] + ' ' : `${index + 1}. `;
			const displayAuthor = author === currentGitUser ? 'You' : author;
			
			return {
				label: `${medal}${displayAuthor}`,
				description: `${lines} lines`,
				detail: `${percentage}% of file`
			};
		});

		const title = praiseMode ? '🏆 Code Champions' : '👀 Blame Leaderboard';
		await vscode.window.showQuickPick(items, {
			placeHolder: title,
			title: `${title} - ${path.basename(editor.document.fileName)}`
		});

	} catch (error) {
		vscode.window.showErrorMessage(`Error creating leaderboard: ${error}`);
	}
}

async function showBlameStatistics(context: vscode.ExtensionContext, editor: vscode.TextEditor) {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('File is not in a workspace');
			return;
		}

		const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
		const command = `git blame --line-porcelain "${relativePath}"`;
		const { stdout } = await execPromise(command, { cwd: workspaceFolder.uri.fsPath });

		const stats = {
			authors: new Map<string, number>(),
			dates: new Map<string, number>(),
			bugFixes: 0,
			totalLines: 0
		};

		const lines = stdout.split('\n');
		let currentSummary = '';
		
		for (const line of lines) {
			if (line.startsWith('author ') && !line.startsWith('author-')) {
				const author = line.substring(7);
				stats.authors.set(author, (stats.authors.get(author) || 0) + 1);
				stats.totalLines++;
			} else if (line.startsWith('author-time ')) {
				const timestamp = parseInt(line.substring(12));
				const date = new Date(timestamp * 1000);
				const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				stats.dates.set(monthYear, (stats.dates.get(monthYear) || 0) + 1);
			} else if (line.startsWith('summary ')) {
				currentSummary = line.substring(8);
				if (isBugFixCommit(currentSummary)) {
					stats.bugFixes++;
				}
			}
		}

		const panel = vscode.window.createWebviewPanel(
			'blameStats',
			`${praiseMode ? '🎉 Code Stats' : '📊 Blame Statistics'} - ${path.basename(editor.document.fileName)}`,
			vscode.ViewColumn.Beside,
			{ enableScripts: true }
		);

		const topAuthors = Array.from(stats.authors.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);

		const recentActivity = Array.from(stats.dates.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.slice(0, 6);

		panel.webview.html = getStatsWebviewContent(
			stats,
			topAuthors,
			recentActivity,
			path.basename(editor.document.fileName)
		);

	} catch (error) {
		vscode.window.showErrorMessage(`Error generating statistics: ${error}`);
	}
}

function getStatsWebviewContent(
	stats: { authors: Map<string, number>; dates: Map<string, number>; bugFixes: number; totalLines: number },
	topAuthors: [string, number][],
	recentActivity: [string, number][],
	fileName: string
): string {
	const authorRows = topAuthors.map(([author, lines], index) => {
		const percentage = ((lines / stats.totalLines) * 100).toFixed(1);
		const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
		const displayAuthor = author === currentGitUser ? 'You' : author;
		return `
			<tr>
				<td>${medals[index]} ${displayAuthor}</td>
				<td>${lines}</td>
				<td>
					<div class="progress-bar">
						<div class="progress-fill" style="width: ${percentage}%"></div>
					</div>
					${percentage}%
				</td>
			</tr>
		`;
	}).join('');

	const activityRows = recentActivity.map(([month, lines]) => `
		<tr>
			<td>${month}</td>
			<td>${lines} lines</td>
		</tr>
	`).join('');

	const bugPercentage = ((stats.bugFixes / stats.totalLines) * 100).toFixed(1);

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Blame Statistics</title>
	<style>
		body {
			padding: 20px;
			color: var(--vscode-foreground);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}
		h1 {
			color: var(--vscode-foreground);
			border-bottom: 2px solid var(--vscode-panel-border);
			padding-bottom: 10px;
		}
		h2 {
			color: var(--vscode-foreground);
			margin-top: 30px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 15px;
		}
		th, td {
			padding: 10px;
			text-align: left;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		th {
			background-color: var(--vscode-editor-background);
			font-weight: bold;
		}
		.stats-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 20px;
			margin: 20px 0;
		}
		.stat-card {
			background-color: var(--vscode-editor-background);
			padding: 20px;
			border-radius: 8px;
			border: 1px solid var(--vscode-panel-border);
		}
		.stat-value {
			font-size: 2em;
			font-weight: bold;
			color: var(--vscode-textLink-foreground);
		}
		.stat-label {
			margin-top: 5px;
			color: var(--vscode-descriptionForeground);
		}
		.progress-bar {
			height: 20px;
			background-color: var(--vscode-panel-border);
			border-radius: 10px;
			overflow: hidden;
			display: inline-block;
			width: 150px;
			margin-right: 10px;
			vertical-align: middle;
		}
		.progress-fill {
			height: 100%;
			background: linear-gradient(90deg, var(--vscode-textLink-foreground), var(--vscode-textLink-activeForeground));
			transition: width 0.3s ease;
		}
	</style>
</head>
<body>
	<h1>${praiseMode ? '🎉' : '📊'} ${fileName} Statistics</h1>
	
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">${stats.totalLines}</div>
			<div class="stat-label">Total Lines</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">${stats.authors.size}</div>
			<div class="stat-label">${praiseMode ? 'Contributors' : 'Authors'}</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">🐛 ${stats.bugFixes}</div>
			<div class="stat-label">Bug Fix Lines (${bugPercentage}%)</div>
		</div>
	</div>

	<h2>${praiseMode ? '🏆 Top Contributors' : '👥 Top Authors'}</h2>
	<table>
		<thead>
			<tr>
				<th>${praiseMode ? 'Contributor' : 'Author'}</th>
				<th>Lines</th>
				<th>Contribution</th>
			</tr>
		</thead>
		<tbody>
			${authorRows}
		</tbody>
	</table>

	<h2>📅 Recent Activity (Last 6 Months)</h2>
	<table>
		<thead>
			<tr>
				<th>Month</th>
				<th>Activity</th>
			</tr>
		</thead>
		<tbody>
			${activityRows}
		</tbody>
	</table>
</body>
</html>`;
}

export function deactivate() {}
