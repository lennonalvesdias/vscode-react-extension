import * as vscode from 'vscode';
import { AgentManagerService } from '../services/AgentManagerService';
import { AgentContext } from '../agents/types';

interface AgentState {
  name: string;
  isEnabled: boolean;
}

export function registerManageAgentsCommand(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('psCopilot.manageAgents', async () => {
    const agentContext: AgentContext = {
      extensionUri: context.extensionUri,
      extensionPath: context.extensionPath,
      globalState: context.globalState,
      workspaceState: context.workspaceState,
      configuration: vscode.workspace.getConfiguration('psCopilot')
    };

    const agentManager = new AgentManagerService(agentContext);
    const agentStates = agentManager.getAgentStates();

    const items = agentStates.map((state: AgentState) => ({
      label: state.name,
      description: state.isEnabled ? 'Ativado' : 'Desativado',
      picked: state.isEnabled
    }));

    const selectedItems = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Selecione os agentes para ativar/desativar'
    });

    if (selectedItems) {
      for (const item of selectedItems) {
        const isEnabled = !agentStates.find((s: AgentState) => s.name === item.label)?.isEnabled;
        agentManager.setAgentState(item.label, isEnabled);
      }

      vscode.window.showInformationMessage('Estado dos agentes atualizado com sucesso!');
    }
  });

  context.subscriptions.push(command);
}
