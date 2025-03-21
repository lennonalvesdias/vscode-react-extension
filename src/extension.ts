import * as vscode from 'vscode';
import { EXTENSION_NAME, VIEW_TYPE } from './configuration';
import { ChatViewProvider } from './webview/ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log(`Extensão "${EXTENSION_NAME}" ativada.`);

    // Registra o provedor de visualização do chat
    const provider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(VIEW_TYPE, provider)
    );
}

export function deactivate() {
    console.log(`Extensão "${EXTENSION_NAME}" desativada.`);
}