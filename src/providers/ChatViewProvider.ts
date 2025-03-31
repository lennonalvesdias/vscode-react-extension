import * as vscode from 'vscode';
import { OpenAIService } from '../services/OpenAIService';
import { AgentContext } from '../agents/types';
import { ConfigurationService } from '../services/ConfigurationService';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'psCopilot.chatView';

  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
  private _selectedModel = 'gpt-3.5-turbo';
  private _availableModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o'
  ];
  private _openAIService: OpenAIService;
  private _configService: ConfigurationService;
  private _isProcessing = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    // Carregar modelo selecionado das configurações
    this._selectedModel = this._context.globalState.get<string>('selectedModel') || 'gpt-3.5-turbo';

    // Inicializar serviços
    const agentContext: AgentContext = {
      apiKey: '',
      model: this._selectedModel,
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      extensionUri: _extensionUri,
      extensionPath: _extensionUri.fsPath,
      globalState: _context.globalState,
      workspaceState: _context.workspaceState,
      configuration: vscode.workspace.getConfiguration('psCopilot')
    };

    this._configService = new ConfigurationService(agentContext);
    this._openAIService = new OpenAIService(agentContext);

    // Carregar API Key
    this._loadApiKey();

    // Verificar se já tem API Key configurada
    this._configService.hasApiKey().then(hasApiKey => {
      if (!hasApiKey) {
        // Adicionar mensagem de boas-vindas instruindo sobre a API Key
        this._messages.push({
          text: 'Bem-vindo ao PS Copilot! Para começar, você precisa configurar sua API Key da OpenAI. Clique no botão "Configurar API Key" quando aparecer na notificação ou use o comando "PS Copilot: Configurar API Key da OpenAI" na paleta de comandos (Ctrl+Shift+P).',
          sender: 'assistant',
          timestamp: new Date()
        });
      }
    });
  }

  private async _loadApiKey() {
    try {
      const apiKey = await this._configService.getApiKey();
      if (apiKey) {
        this._openAIService.setApiKey(apiKey);
      }
    } catch (error) {
      console.error('Erro ao carregar API Key:', error);
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    // Defina um título para a view
    webviewView.description = "Assistente com múltiplos agentes";

    // Renderize o HTML da view
    this._updateWebview();

    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'sendMessage':
            try {
              if (this._isProcessing) { return; }

              // Adiciona a mensagem do usuário
              const userMessage: ChatMessage = {
                text: message.text,
                sender: 'user',
                timestamp: new Date()
              };
              this._messages.push(userMessage);

              // Atualiza o HTML para mostrar a mensagem do usuário
              this._updateWebview();

              // Define o estado como processando
              this._isProcessing = true;
              this._updateWebview();

              // Processa a mensagem
              const response = await this._processMessage(message.text);

              // Adiciona a resposta do assistente
              const assistantMessage: ChatMessage = {
                text: response,
                sender: 'assistant',
                timestamp: new Date()
              };
              this._messages.push(assistantMessage);

              // Define o estado como não processando
              this._isProcessing = false;

              // Atualiza o HTML do webview
              this._updateWebview();
            } catch (error) {
              this._isProcessing = false;
              vscode.window.showErrorMessage('Erro ao processar mensagem: ' + error);
              this._updateWebview();
            }
            break;
          case 'clearChat':
            this._messages = [];
            this._updateWebview();
            break;
          case 'changeModel':
            this._selectedModel = message.model;
            this._context.globalState.update('selectedModel', this._selectedModel);
            this._openAIService.setModel(this._selectedModel);
            vscode.window.showInformationMessage(`Modelo alterado para: ${this._selectedModel}`);
            this._updateWebview();
            break;
          case 'configApiKey':
            vscode.commands.executeCommand('psCopilot.configureApiKey');
            break;
        }
      }
    );
  }

  private async _processMessage(text: string): Promise<string> {
    try {
      // Verifica se tem API Key
      const apiKey = await this._configService.getApiKey();
      if (!apiKey) {
        // Avisa o usuário na interface e oferece um botão para configurar a API Key
        vscode.window.showErrorMessage(
          'API Key da OpenAI não configurada',
          'Configurar API Key'
        ).then(selection => {
          if (selection === 'Configurar API Key') {
            vscode.commands.executeCommand('psCopilot.configureApiKey');
          }
        });

        return 'API Key não configurada. Por favor, clique no botão "Configurar API Key" na notificação acima ou use o comando "PS Copilot: Configurar API Key da OpenAI" na paleta de comandos (Ctrl+Shift+P).';
      }

      // Processa a mensagem com o OpenAI
      return await this._openAIService.processChat(text);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);

      // Se o erro for de API Key não configurada, mostra a opção de configurar
      if (error instanceof Error && error.message.includes('API Key não configurada')) {
        vscode.window.showErrorMessage(
          'API Key da OpenAI não configurada',
          'Configurar API Key'
        ).then(selection => {
          if (selection === 'Configurar API Key') {
            vscode.commands.executeCommand('psCopilot.configureApiKey');
          }
        });
      }

      return `Ocorreu um erro ao processar sua mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private _updateWebview() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }

  private _getHtmlForWebview() {
    // Estilos CSS para o chat (inspirado no GitHub Copilot)
    const styleContent = `
      :root {
        --vscode-foreground: var(--vscode-editor-foreground);
        --vscode-background: var(--vscode-editor-background);
        --vscode-border: var(--vscode-panel-border);
        --copilot-blue: #0078d4;
        --message-bg-user: var(--vscode-editor-inactiveSelectionBackground);
        --message-bg-assistant: var(--vscode-editorWidget-background);
        --input-bg: var(--vscode-input-background);
        --input-fg: var(--vscode-input-foreground);
        --button-bg: var(--copilot-blue);
        --button-fg: white;
        --border-color: var(--vscode-panel-border);
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        padding: 0;
        margin: 0;
        background-color: var(--vscode-background);
        color: var(--vscode-foreground);
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
      }

      .model-selector {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .model-selector select {
        background-color: var(--input-bg);
        color: var(--input-fg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 4px 8px;
      }

      .chat-actions {
        display: flex;
        gap: 8px;
      }

      .icon-button {
        background: none;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        padding: 4px;
        opacity: 0.7;
      }

      .icon-button:hover {
        opacity: 1;
      }

      .chat-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }

      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .message {
        display: flex;
        max-width: 100%;
        word-wrap: break-word;
      }

      .message-content {
        padding: 10px 14px;
        border-radius: 6px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .user-message {
        justify-content: flex-end;
      }

      .user-message .message-content {
        background-color: var(--message-bg-user);
        border-top-right-radius: 2px;
      }

      .assistant-message {
        justify-content: flex-start;
      }

      .assistant-message .message-content {
        background-color: var(--message-bg-assistant);
        border-top-left-radius: 2px;
      }

      .message-time {
        font-size: 11px;
        margin-top: 4px;
        opacity: 0.6;
        text-align: right;
      }

      .input-container {
        display: flex;
        padding: 12px;
        border-top: 1px solid var(--border-color);
        background-color: var(--vscode-background);
      }

      .input-textarea {
        flex: 1;
        padding: 10px 12px;
        background-color: var(--input-bg);
        color: var(--input-fg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        resize: none;
        min-height: 20px;
        max-height: 120px;
        font-family: inherit;
        line-height: 1.5;
      }

      .input-textarea:focus {
        outline: 1px solid var(--copilot-blue);
      }

      .send-button {
        padding: 6px 12px;
        margin-left: 8px;
        background-color: var(--button-bg);
        color: var(--button-fg);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .send-button:hover {
        opacity: 0.9;
      }

      .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        align-items: center;
      }

      .typing-indicator span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--vscode-foreground);
        opacity: 0.5;
        animation: typing 1s infinite ease-in-out;
      }

      .typing-indicator span:nth-child(1) {
        animation-delay: 0s;
      }

      .typing-indicator span:nth-child(2) {
        animation-delay: 0.3s;
      }

      .typing-indicator span:nth-child(3) {
        animation-delay: 0.6s;
      }

      @keyframes typing {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 16px;
        opacity: 0.7;
        padding: 16px;
        text-align: center;
      }

      .empty-state h3 {
        margin: 0;
        margin-bottom: 8px;
      }

      .empty-state p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }

      .empty-state-actions {
        margin-top: 16px;
      }

      .action-button {
        background-color: var(--button-bg);
        color: var(--button-fg);
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
      }

      .action-button:hover {
        opacity: 0.9;
      }
    `;

    // Renderiza as mensagens
    let messagesHtml = '';

    if (this._messages.length === 0) {
      messagesHtml = `
        <div class="empty-state">
          <h3>Bem-vindo ao PS Copilot</h3>
          <p>
            Assistente de desenvolvimento React com múltiplos agentes especializados.<br>
            Faça perguntas sobre desenvolvimento, design, arquitetura ou testes.
          </p>
          <div class="empty-state-actions">
            <button id="configApiKeyBtn" class="action-button">Configurar API Key</button>
          </div>
        </div>
      `;
    } else {
      for (const message of this._messages) {
        const messageClass = message.sender === 'user' ? 'user-message' : 'assistant-message';
        const time = message.timestamp.toLocaleTimeString();

        messagesHtml += `
          <div class="message ${messageClass}">
            <div>
              <div class="message-content">${this._escapeHtml(message.text)}</div>
              <div class="message-time">${time}</div>
            </div>
          </div>
        `;
      }
    }

    // Adiciona indicador de digitação se estiver processando
    if (this._isProcessing) {
      messagesHtml += `
        <div class="message assistant-message">
          <div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Cria o dropdown de modelos
    let modelOptionsHtml = '';
    for (const model of this._availableModels) {
      const selected = model === this._selectedModel ? 'selected' : '';
      modelOptionsHtml += `<option value="${model}" ${selected}>${model}</option>`;
    }

    // Script JavaScript para interação do chat
    const scriptContent = `
      const vscode = acquireVsCodeApi();

      // Elementos do DOM
      const messagesContainer = document.getElementById('messages');
      const textarea = document.getElementById('messageInput');
      const sendButton = document.getElementById('sendButton');
      const modelSelector = document.getElementById('modelSelector');
      const clearButton = document.getElementById('clearButton');
      const configApiKeyBtn = document.getElementById('configApiKeyBtn');

      // Ajusta altura do textarea conforme digitação
      function adjustTextareaHeight() {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }

      // Rolar para o final da conversa
      function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Inicialização
      scrollToBottom();
      textarea.focus();

      // Eventos
      textarea.addEventListener('input', adjustTextareaHeight);

      // Enviar mensagem
      function sendMessage() {
        const text = textarea.value.trim();

        if (text) {
          vscode.postMessage({
            command: 'sendMessage',
            text: text
          });

          // Limpar e reajustar textarea
          textarea.value = '';
          textarea.style.height = 'auto';
          textarea.focus();
        }
      }

      // Handler para botão enviar
      sendButton.addEventListener('click', sendMessage);

      // Handler para tecla Enter (sem shift)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      // Alteração de modelo
      modelSelector.addEventListener('change', (e) => {
        vscode.postMessage({
          command: 'changeModel',
          model: e.target.value
        });
      });

      // Limpar chat
      clearButton.addEventListener('click', () => {
        vscode.postMessage({
          command: 'clearChat'
        });
      });

      // Rolar para o final inicialmente
      scrollToBottom();

      // Configurar API Key
      if (configApiKeyBtn) {
        configApiKeyBtn.addEventListener('click', () => {
          vscode.postMessage({
            command: 'configApiKey'
          });
        });
      }
    `;

    return `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
          <title>PS Copilot Chat</title>
          <style>${styleContent}</style>
        </head>
        <body>
          <div class="chat-container">
            <div class="chat-header">
              <div class="model-selector">
                <span>Modelo:</span>
                <select id="modelSelector">
                  ${modelOptionsHtml}
                </select>
              </div>
              <div class="chat-actions">
                <button id="clearButton" class="icon-button" title="Limpar conversa">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 4H3H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 4V2C5 1.73478 5.10536 1.48043 5.29289 1.29289C5.48043 1.10536 5.73478 1 6 1H10C10.2652 1 10.5196 1.10536 10.7071 1.29289C10.8946 1.48043 11 1.73478 11 2V4M13 4V14C13 14.2652 12.8946 14.5196 12.7071 14.7071C12.5196 14.8946 12.2652 15 12 15H4C3.73478 15 3.48043 14.8946 3.29289 14.7071C3.10536 14.5196 3 14.2652 3 14V4H13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="messages-container" id="messages">
              ${messagesHtml}
            </div>
            <div class="input-container">
              <textarea
                id="messageInput"
                class="input-textarea"
                placeholder="Digite sua mensagem..."
                rows="1"
              ></textarea>
              <button id="sendButton" class="send-button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.6668 1.33333L7.3335 8.66666" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M14.6668 1.33333L10.0002 14.6667L7.3335 8.66666L1.3335 6L14.6668 1.33333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <script>${scriptContent}</script>
        </body>
      </html>`;
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
