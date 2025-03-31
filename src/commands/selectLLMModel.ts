import * as vscode from 'vscode';
import { LLMService } from '../services/LLMService';

export function registerSelectLLMModelCommand(context: vscode.ExtensionContext) {
  const llmService = new LLMService(context);

  let disposable = vscode.commands.registerCommand('psCopilot.selectLLMModel', async () => {
    try {
      await llmService.selectModel();
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao selecionar modelo LLM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  });

  context.subscriptions.push(disposable);
}
