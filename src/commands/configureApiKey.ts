import * as vscode from 'vscode';
import { ConfigurationService } from '../services/ConfigurationService';
import { AgentContext } from '../agents/types';

export function registerConfigureApiKeyCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('psCopilot.configureApiKey', async () => {
    try {
      const agentContext: AgentContext = {
        apiKey: '',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30000,
        extensionUri: context.extensionUri,
        extensionPath: context.extensionPath,
        globalState: context.globalState,
        workspaceState: context.workspaceState,
        configuration: vscode.workspace.getConfiguration('psCopilot')
      };

      const configService = new ConfigurationService(agentContext);
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Digite sua API Key da OpenAI',
        password: true
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
