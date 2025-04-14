import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { registerConfigureApiKeyCommand as _registerConfigureApiKeyCommand } from './commands/configureApiKey';
import { registerSelectLLMModelCommand } from './commands/selectLLMModel';
import { ConfigurationService } from './services/ConfigurationService';

// API Key configurada com sucesso - emitir evento
const apiKeyConfigEvent = new vscode.EventEmitter<void>();
export const onApiKeyConfigured = apiKeyConfigEvent.event;

export function activate(context: vscode.ExtensionContext) {
  console.log('Ativando a extensão PS Copilot');

  // Cria contexto para os agentes
  const agentContext = {
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
      try {
        // Usa o método principal setApiKey que implementa validação e segurança
        await configService.setApiKey(apiKey);

        // Emite evento para notificar componentes que a API Key foi configurada
        apiKeyConfigEvent.fire();

        // Sucesso - mostrar mensagem positiva
        vscode.window.showInformationMessage('API Key da OpenAI configurada com sucesso! O chat está pronto para uso.', 'Abrir Chat').then(selection => {
          if (selection === 'Abrir Chat') {
            vscode.commands.executeCommand('psCopilot.openChat');
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Erro ao configurar API Key: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  });

  // Registra o comando para limpar a API key
  const clearApiKeyCommand = vscode.commands.registerCommand('psCopilot.clearApiKey', async () => {
    await configService.clearApiKey();
    vscode.window.showInformationMessage('API key da OpenAI removida!');
  });

  // Registra o provedor da view do chat
  const chatViewProvider = new ChatViewProvider(context.extensionUri, context);

  // Registra o provedor de webview para a view principal
  const chatViewRegistration = vscode.window.registerWebviewViewProvider(
    'psCopilot.chatView',
    chatViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  // Registra o mesmo provedor para a view do explorer
  const explorerChatViewRegistration = vscode.window.registerWebviewViewProvider(
    'psCopilot.explorerChatView',
    chatViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );

  context.subscriptions.push(chatViewRegistration, explorerChatViewRegistration);

  // Registra o comando para abrir o chat
  const openChatCommand = vscode.commands.registerCommand('psCopilot.openChat', () => {
    console.log('Comando psCopilot.openChat executado');
    vscode.commands.executeCommand('workbench.view.extension.psCopilot');
  });

  context.subscriptions.push(openChatCommand);

  // Registra o comando para abrir o chat no Explorer
  const openChatInExplorerCommand = vscode.commands.registerCommand('psCopilot.openChatInExplorer', () => {
    console.log('Comando psCopilot.openChatInExplorer executado');
    // Abre a view no Explorer
    vscode.commands.executeCommand('psCopilot.explorerChatView.focus');
  });

  context.subscriptions.push(openChatInExplorerCommand);

  // Registra os outros comandos
  _registerConfigureApiKeyCommand(context);
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
