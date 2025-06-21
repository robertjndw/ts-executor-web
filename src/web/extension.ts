// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as esbuild from 'esbuild-wasm';
import { Utils } from 'vscode-uri';

// This method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "ts-executor-web" is now active in the web extension host!');

    const outputChannel = vscode.window.createOutputChannel('TS Executor Logs');

    await esbuild.initialize({
        wasmURL: 'https://unpkg.com/esbuild-wasm@0.24.2/esbuild.wasm',
    });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('ts-executor-web.runCode', async () => {
        const workspaceFiles = await vscode.workspace.findFiles('**/*.{ts,js}', '**/node_modules/**');
        if (workspaceFiles.length === 0) {
            vscode.window.showErrorMessage('No JavaScript or TypeScript files found in the workspace.');
            return;
        }

        // Load the content of each file
        const fileContents: Record<string, string> = {};
        for (const file of workspaceFiles) {
            const document = await vscode.workspace.openTextDocument(file);
            console.log('Reading file:', file.fsPath);
            fileContents[file.fsPath] = document.getText();
        }

        // Determine the entry file (current active editor file)
        const entryFile = vscode.window.activeTextEditor?.document.fileName;
        if (!entryFile || !fileContents[entryFile]) {
            vscode.window.showErrorMessage('No active editor or entry file detected.');
            return;
        }

        // Bundle the files using esbuild-wasm
        let bundledCode: string;
        try {
            const result = await esbuild.build({
                entryPoints: [entryFile],
                bundle: true,
                write: false, // Prevent writing to disk
                platform: 'browser',
                target: 'esnext',
                plugins: [
                    {
                        name: 'virtual-fs',
                        setup(build) {
                            // Resolve paths
                            build.onResolve({ filter: /.*/ }, (args) => {                            
                                if (args.path.startsWith('.')) {
                                    // Resolve relative paths based on the current file's directory
                                    const baseDir =  Utils.dirname(vscode.Uri.file(entryFile));
                                    const resolvedPath =  Utils.joinPath(baseDir, args.path).fsPath;
                            
                                    for (const ext of ['.ts', '.js']) {
                                        if (fileContents[resolvedPath + ext]) {
                                            console.debug('Resolved path found in virtual file system');
                                            return { path: resolvedPath + ext, namespace: 'virtual-fs' };
                                        }
                                    }
                                } else if (fileContents[args.path]) {
                                    // Handle absolute or imported module paths
                                    return { path: args.path, namespace: 'virtual-fs' };
                                }
                            
                                // Mark as external if the file is not in the virtual file system
                                return { path: args.path, external: true };
                            });

                            // Load content from the virtual file system
                            build.onLoad({ filter: /.*/, namespace: 'virtual-fs' }, (args) => {
                                console.log('Loading:', args.path);
                                const content = fileContents[args.path];
                                const loader = args.path.endsWith('.ts') ? 'ts' : 'js';
                                return { contents: content, loader: loader };
                            });
                        },
                    },
                ],
            });

            bundledCode = result.outputFiles?.[0]?.text || '';
        } catch (err) {
            vscode.window.showErrorMessage(`Error bundling files: ${err}`);
            return;
        }

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

        // Execute the code in a sandbox
        try {
            const sandbox = {
                console: customConsole,
                require: undefined, // Prevent using Node.js require
                module: undefined,  // Prevent module access
                exports: undefined, // Prevent module.exports
            };
            const sandboxedEval = new Function('sandbox', 'with(sandbox) { ' + bundledCode + ' }');
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
