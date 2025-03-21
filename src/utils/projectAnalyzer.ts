import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function isReactProject(): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return false;
    }
    for (const folder of workspaceFolders) {
        const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.dependencies && packageJson.dependencies.react) {
                    return true;
                }
            } catch (error) {
                console.error('Erro ao ler package.json:', error);
            }
        }
    }
    return false;
}
