import * as vscode from 'vscode';
import { EXTENSION_NAME, VIEW_TYPE, VIEW_CONTAINER_ID } from './configuration';
import { ChatViewProvider } from './webview/ChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log(`Extensão "${EXTENSION_NAME}" ativada.`);

    try {
        // Registra o provedor de visualização do chat
        const provider = new ChatViewProvider(context.extensionUri);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(VIEW_TYPE, provider)
        );
        console.log(`View provider registrado com sucesso: ${VIEW_TYPE}`);

        // Registra o comando para abrir o chat
        let disposable = vscode.commands.registerCommand('arsenalSoma.openChat', async () => {
            console.log('Comando openChat executado');
            try {
                await vscode.commands.executeCommand('workbench.action.focusActivityBar');
                await vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER_ID}`);
                console.log('View container aberto com sucesso');
            } catch (error) {
                console.error('Erro ao abrir view container:', error);
            }
        });

        context.subscriptions.push(disposable);
        console.log('Comando openChat registrado com sucesso');

        // Tenta mostrar a view automaticamente após um pequeno delay
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand('workbench.action.focusActivityBar');
                await vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER_ID}`);
                console.log('View container aberto automaticamente com sucesso');
            } catch (error) {
                console.error('Erro ao abrir view container automaticamente:', error);
            }
        }, 1000);

    } catch (error) {
        console.error('Erro ao ativar extensão:', error);
    }
}

export function deactivate() {
    console.log(`Extensão "${EXTENSION_NAME}" desativada.`);
}