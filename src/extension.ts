import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { registerManageAgentsCommand } from './commands/manageAgents';
import { registerConfigureApiKeyCommand as _registerConfigureApiKeyCommand } from './commands/configureApiKey';
import { registerSelectLLMModelCommand } from './commands/selectLLMModel';
import { ConfigurationService } from './services/ConfigurationService';
import { AgentContext } from './agents/types';

export function activate(context: vscode.ExtensionContext) {
  console.log('Ativando a extensão PS Copilot');

  // Cria contexto para os agentes
  const agentContext: AgentContext = {
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 30000,
    extensionUri: context.extensionUri,
    extensionPath: context.extensionUri.fsPath,
    globalState: context.globalState,
    workspaceState: context.workspaceState,
    configuration: vscode.workspace.getConfiguration('psCopilot')
  };

  // Inicializa o serviço de configuração
  const configService = new ConfigurationService(agentContext);

  // Registra o comando para definir a API key (principal)
  const setApiKeyCommand = vscode.commands.registerCommand('psCopilot.configureApiKey', async () => {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Insira sua API key da OpenAI',
      placeHolder: 'sk-...',
      password: true
    });

    if (apiKey) {
      // Usa o método principal setApiKey que implementa validação e segurança
      await configService.setApiKey(apiKey);
    }
  });

  // Registra o comando para limpar a API key
  const clearApiKeyCommand = vscode.commands.registerCommand('psCopilot.clearApiKey', async () => {
    await configService.clearApiKey();
    vscode.window.showInformationMessage('API key da OpenAI removida!');
  });

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
  registerSelectLLMModelCommand(context);

  // Adiciona os comandos ao contexto de subscrições
  context.subscriptions.push(setApiKeyCommand, clearApiKeyCommand);

  // Verifica se já há uma API key configurada
  checkApiKeyStatus(configService);

  console.log('Extensão PS Copilot ativada com sucesso!');
}

// Verifica e informa o status da API key
async function checkApiKeyStatus(configService: ConfigurationService): Promise<void> {
  try {
    const hasApiKey = await configService.hasApiKey();
    if (!hasApiKey) {
      vscode.window.showWarningMessage(
        'API key da OpenAI não encontrada. Use o comando "PS Copilot: Configurar API Key da OpenAI" para configurá-la.'
      );
    } else {
      console.log('API key da OpenAI está configurada');
    }
  } catch (error) {
    console.error('Erro ao verificar API key:', error);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Cleanup is handled automatically by VS Code via the disposables/subscriptions
}
