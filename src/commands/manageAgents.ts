import * as vscode from 'vscode';
import { AgentManagerService } from '../services/AgentManagerService';
import { AgentContext } from '../agents/types';

export function registerManageAgentsCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('psCopilot.manageAgents', async () => {
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

      const agentManager = new AgentManagerService(agentContext);
      const agentStates = agentManager.getAgentStates();

      const items = agentStates.map(state => ({
        label: state.name,
        description: state.isEnabled ? 'Ativado' : 'Desativado',
        picked: state.isEnabled
      }));

      const selectedItems = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Selecione os agentes para ativar/desativar'
      });

      if (selectedItems) {
        // Obtém os nomes dos agentes selecionados
        const selectedAgentNames = selectedItems.map(item => item.label);

        // Atualiza o estado de cada agente
        for (const state of agentStates) {
          const isSelected = selectedAgentNames.includes(state.name);
          agentManager.setAgentState(state.name, isSelected);
        }

        vscode.window.showInformationMessage('Estado dos agentes atualizado com sucesso!');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao gerenciar agentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  });

  context.subscriptions.push(disposable);
}
