import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { registerManageAgentsCommand } from './commands/manageAgents';
import { registerConfigureApiKeyCommand } from './commands/configureApiKey';
import { registerSelectLLMModelCommand } from './commands/selectLLMModel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Ativando a extensão PS Copilot');

  // Registra o provedor da view do chat
  const chatViewProvider = new ChatViewProvider(context.extensionUri, context);

  // Registra o provedor de webview
  const chatViewRegistration = vscode.window.registerWebviewViewProvider(
    'psCopilot.chatView',
    chatViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  context.subscriptions.push(chatViewRegistration);

  // Registra o comando para abrir o chat
  const openChatCommand = vscode.commands.registerCommand('psCopilot.openChat', () => {
    console.log('Comando psCopilot.openChat executado');
    vscode.commands.executeCommand('workbench.view.extension.psCopilot');
  });

  context.subscriptions.push(openChatCommand);

  // Registra os outros comandos
  registerManageAgentsCommand(context);
  registerConfigureApiKeyCommand(context);
  registerSelectLLMModelCommand(context);

  console.log('Extensão PS Copilot ativada com sucesso!');
}
