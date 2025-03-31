import * as vscode from 'vscode';

export function registerSelectLLMModelCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('psCopilot.selectLLMModel', () => {
    vscode.window.showInformationMessage('Seleção de modelo LLM');
  });

  context.subscriptions.push(disposable);
}
