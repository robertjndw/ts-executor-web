# ts-executor-web

A VSCode extension to execute TypeScript code directly in the browser.

## Features
- **Execute Code in Browser**: Bundle and run the code from your active editor.
- **Virtual File System**: Dynamically loads and bundles files from the workspace.
- **Output Capture**: Captures console logs and displays them in the VSCode output channel.

## Prerequisites
- **Visual Studio Code** version 1.74.0 or later.
- **Node.js** and **npm** for installing dependencies and building the project.

## Usage
Executing TypeScript/JavaScript Code
Open the main TypeScript or JavaScript file and trigger the `Run TypeScript Code` command from the command palette. Alternatively, you can use the "Run" button in the editor title menu (top right corner).

## Installation
1. Clone the repository.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the project as VSIX file:
   ```sh
    npm run package
    ```
4. Install the extension from the VSIX file
