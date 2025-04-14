import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { registerSelectLLMModelCommand } from './commands/selectLLMModel';

export function activate(context: vscode.ExtensionContext) {
  console.log('PS Copilot está ativo!');

  const chatViewProvider = new ChatViewProvider(context.extensionUri, context);

  const chatViewRegistration = vscode.window.registerWebviewViewProvider(
    'psCopilot.chatView',
    chatViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  const explorerChatViewRegistration = vscode.window.registerWebviewViewProvider(
    'psCopilot.explorerChatView',
    chatViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  context.subscriptions.push(chatViewRegistration, explorerChatViewRegistration);

  const openChatCommand = vscode.commands.registerCommand('psCopilot.openChat', () => {
    console.log('Comando psCopilot.openChat executado');
    vscode.commands.executeCommand('workbench.view.extension.psCopilot');
  });

  context.subscriptions.push(openChatCommand);

  const openChatInExplorerCommand = vscode.commands.registerCommand('psCopilot.openChatInExplorer', () => {
    console.log('Comando psCopilot.openChatInExplorer executado');
    vscode.commands.executeCommand('psCopilot.explorerChatView.focus');
  });

  context.subscriptions.push(openChatInExplorerCommand);

  registerSelectLLMModelCommand(context);

  context.subscriptions.push(
    chatViewRegistration,
    explorerChatViewRegistration,
    openChatCommand,
    openChatInExplorerCommand
  );

  console.log('Extensão PS Copilot ativada com sucesso!');
}

export function deactivate() {
  // Cleanup is handled automatically by VS Code via the disposables/subscriptions
}
