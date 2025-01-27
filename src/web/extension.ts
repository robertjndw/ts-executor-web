// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ts from 'typescript';

// This method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ts-executor-web" is now active in the web extension host!');

	const outputChannel = vscode.window.createOutputChannel('TS Executor Logs');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('ts-executor-web.runCode', () => {
        // Get the active editor and file content
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const document = editor.document;
        const textContent = document.getText();

        // Determine file type (JavaScript or TypeScript)
        const isTypeScript = document.languageId === 'typescript';

        // Prepare a custom console to capture logs
        const capturedLogs: string[] = [];
        const customConsole = {
            log: (...args: undefined[]) => {
                const logMessage = args.map(arg => JSON.stringify(arg, null, 2)).join(' ');
                capturedLogs.push(logMessage);
            },
            error: (...args: undefined[]) => {
                const errorMessage = args.map(arg => JSON.stringify(arg, null, 2)).join(' ');
                capturedLogs.push(`[Error]: ${errorMessage}`);
            },
            warn: (...args: undefined[]) => {
                const warnMessage = args.map(arg => JSON.stringify(arg, null, 2)).join(' ');
                capturedLogs.push(`[Warning]: ${warnMessage}`);
            },
        };

        // Transpile if TypeScript, otherwise execute as is
        let executableCode = textContent;
        if (isTypeScript) {
            try {
                executableCode = ts.transpile(textContent, { module: ts.ModuleKind.ESNext });
            } catch (err) {
                vscode.window.showErrorMessage(`TypeScript transpilation failed: ${err}`);
                return;
            }
        }

        // Execute the code in a sandbox
        try {
            const sandbox = {
                console: customConsole,
                require: undefined, // Prevent using Node.js require
                module: undefined,  // Prevent module access
                exports: undefined, // Prevent module.exports
            };
            const sandboxedEval = new Function('sandbox', 'with(sandbox) { ' + executableCode + ' }');
            sandboxedEval(sandbox);

            // Show captured logs in a VSCode output channel
			outputChannel.clear();
            outputChannel.show(true);
            capturedLogs.forEach(log => outputChannel.appendLine(log));
        } catch (err) {
            vscode.window.showErrorMessage(`Error executing code: ${err}`);
        }
    });

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Noop
}