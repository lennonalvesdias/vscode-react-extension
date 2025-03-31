import * as vscode from 'vscode';
import { ChatViewProvider } from './components/ChatViewProvider';
import { registerManageAgentsCommand } from './commands/manageAgents';
import { registerConfigureApiKeyCommand } from './commands/configureApiKey';
import { registerSelectLLMModelCommand } from './commands/selectLLMModel';

export function activate(context: vscode.ExtensionContext) {
  const chatViewProvider = new ChatViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'psCopilot.chatView',
      chatViewProvider
    )
  );

  let openChatCommand = vscode.commands.registerCommand('psCopilot.openChat', () => {
    vscode.commands.executeCommand('workbench.view.extension.ps-copilot');
  });

  context.subscriptions.push(openChatCommand);

  registerManageAgentsCommand(context);
  registerConfigureApiKeyCommand(context);
  registerSelectLLMModelCommand(context);
}

export function deactivate() { }
