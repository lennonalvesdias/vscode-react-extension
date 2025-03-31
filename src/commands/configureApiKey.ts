import * as vscode from 'vscode';
import { ConfigurationService } from '../services/ConfigurationService';

export function registerConfigureApiKeyCommand(context: vscode.ExtensionContext) {
    const configService = new ConfigurationService(context);

    let disposable = vscode.commands.registerCommand('psCopilot.configureApiKey', async () => {
        try {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Digite sua API Key da OpenAI',
                password: true,
                ignoreFocusOut: true
            });

            if (apiKey) {
                await configService.setApiKey(apiKey);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Erro ao configurar API Key: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    });

    context.subscriptions.push(disposable);
}
