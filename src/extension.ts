import * as vscode from 'vscode';
import { ReactChatViewProvider } from './ReactChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new ReactChatViewProvider(context, context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ReactChatViewProvider.viewType,
            provider
        )
    );
}

export function deactivate() { } 