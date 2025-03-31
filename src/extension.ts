import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { registerManageAgentsCommand } from './commands/manageAgents';
import { registerConfigureApiKeyCommand } from './commands/configureApiKey';
import { registerSelectLLMModelCommand } from './commands/selectLLMModel';

export function activate(context: vscode.ExtensionContext) {
  const chatViewProvider = new ChatViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'psCopilot.chatView',
      chatViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  const openChatCommand = vscode.commands.registerCommand('psCopilot.openChat', () => {
    vscode.commands.executeCommand('workbench.view.extension.psCopilot');
  });

  context.subscriptions.push(openChatCommand);

  registerManageAgentsCommand(context);
  registerConfigureApiKeyCommand(context);
  registerSelectLLMModelCommand(context);
}
