import * as vscode from 'vscode';

export type LLMModel = 'gpt-4' | 'gpt-3.5-turbo';

export class LLMService {
  private readonly MODEL_KEY = 'llm.model';

  constructor(private context: vscode.ExtensionContext) { }

  async getModel(): Promise<LLMModel> {
    return this.context.globalState.get<LLMModel>(this.MODEL_KEY) || 'gpt-4';
  }

  async setModel(model: LLMModel): Promise<void> {
    await this.context.globalState.update(this.MODEL_KEY, model);
    vscode.window.showInformationMessage(`Modelo LLM alterado para ${model}`);
  }

  async selectModel(): Promise<void> {
    const items = [
      { label: 'GPT-4', description: 'Mais preciso e capaz', value: 'gpt-4' },
      { label: 'GPT-3.5 Turbo', description: 'Mais rápido e econômico', value: 'gpt-3.5-turbo' }
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Selecione o modelo LLM'
    });

    if (selected) {
      await this.setModel(selected.value as LLMModel);
    }
  }
}
