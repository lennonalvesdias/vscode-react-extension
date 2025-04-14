import * as vscode from 'vscode';
import { OpenAIService } from '../services/OpenAIService';
import { CodeGenerationService } from '../services/CodeGenerationService';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'psCopilot.chatView';

  private _view?: vscode.WebviewView;
  private _messages: ChatMessage[] = [];
  private _selectedModel = 'gpt-4o';
  private _availableModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o'
  ];
  private _openAIService: OpenAIService | null = null;
  private _codeGenerationService: CodeGenerationService | null = null;
  private _isProcessing = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._selectedModel = this._context.globalState.get<string>('selectedModel') || 'gpt-4o';

    try {
      this._openAIService = new OpenAIService();
      this._codeGenerationService = new CodeGenerationService();

      console.log('ChatViewProvider: Serviços inicializados.');

      this.showWelcomeOrStatusMessage();

    } catch (error) {
      console.error("Erro ao inicializar serviços no ChatViewProvider:", error);
    }

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('psCopilot')) {
        console.log('Configurações do PS Copilot mudaram, atualizando Webview se necessário...');
        this._updateWebview();
      }
    });
  }

  private async showWelcomeOrStatusMessage() {
    if (!this._openAIService || !this._openAIService.hasApiKey()) {
      const provider = vscode.workspace.getConfiguration('psCopilot').get<'openai' | 'azure'>('provider') || 'openai';
      let configMsg = 'Configure suas credenciais nas configurações do VS Code.';
      if (provider === 'azure') {
        configMsg = 'Configure o Endpoint, API Key e Deployment Name do Azure OpenAI nas configurações.';
      } else {
        configMsg = 'Configure sua API Key da OpenAI nas configurações.';
      }
      this.addMessage(`Bem-vindo ao PS Copilot! Para começar, ${configMsg}`, 'assistant');
    } else {
      console.log('OpenAIService está pronto.');
    }
    this._updateWebview();
  }

  private addMessage(text: string, sender: 'user' | 'assistant') {
    this._messages.push({
      text: text,
      sender: sender,
      timestamp: new Date()
    });
    this._updateWebview();
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    await this._updateWebview();

    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'sendMessage':
            try {
              if (this._isProcessing) { return; }

              this.addMessage(message.text, 'user');

              this._isProcessing = true;
              this._updateWebview();

              if (!this._openAIService || !this._codeGenerationService) {
                throw new Error("Serviços de IA não inicializados corretamente.");
              }

              if (!this._openAIService.hasApiKey()) {
                const provider = vscode.workspace.getConfiguration('psCopilot').get<'openai' | 'azure'>('provider') || 'openai';
                let errorMsg = 'Credenciais não configuradas. ';
                if (provider === 'azure') {
                  errorMsg += 'Verifique Endpoint, API Key e Deployment Name do Azure.';
                } else {
                  errorMsg += 'Verifique a API Key da OpenAI.';
                }
                throw new Error(errorMsg);
              }

              const response = await this._processMessage(message.text);
              this.addMessage(response, 'assistant');

            } catch (error) {
              const errorText = `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
              this.addMessage(errorText, 'assistant');
              vscode.window.showErrorMessage(errorText);
            } finally {
              this._isProcessing = false;
              this._updateWebview();
            }
            break;
          case 'clearChat':
            this._messages = [];
            await this._updateWebview();
            break;
          case 'changeModel':
            this._selectedModel = message.model;
            this._context.globalState.update('selectedModel', this._selectedModel);
            vscode.window.showInformationMessage(`Seleção de modelo na UI alterada para: ${this._selectedModel}. A configuração real usada depende do provedor.`);
            await this._updateWebview();
            break;
        }
      }
    );
  }

  private async _processMessage(text: string): Promise<string> {
    if (!this._openAIService || !this._codeGenerationService) {
      throw new Error("Serviços de IA não inicializados.");
    }
    try {
      if (this._isCodeGenerationRequest(text)) {
        return await this._handleCodeGeneration(text);
      }
      return await this._openAIService.chat(text);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      throw error;
    }
  }

  private _isCodeGenerationRequest(text: string): boolean {
    const lowerText = text.toLowerCase();

    const codeGenPatterns = [
      'crie um componente',
      'criar componente',
      'crie uma página',
      'criar página',
      'crie um hook',
      'criar hook',
      'crie um serviço',
      'criar serviço',
      'gere um componente',
      'gerar componente',
      'implemente um componente',
      'implementar componente',
      'desenvolva um componente',
      'desenvolver componente',
      'gere uma página',
      'desenvolva uma página',
      'implemente uma página',
      'gere uma interface',
      'desenvolva uma interface',
      'gere um formulário',
      'crie um formulário',
      'gere um serviço',
      'gere um hook',
      'crie um módulo',
      'gere um módulo',
      'código para',
      'implementação de',
      'desenvolver um',
      'desenvolva um',
      'construa um',
      'construir um'
    ];

    return codeGenPatterns.some(pattern => lowerText.includes(pattern));
  }

  private async _handleCodeGeneration(text: string): Promise<string> {
    if (!this._openAIService || !this._codeGenerationService) {
      throw new Error("Serviços de IA não inicializados.");
    }
    try {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return 'Não foi possível gerar o código porque nenhum workspace está aberto. Abra um projeto para gerar código.';
      }

      console.log('Identificando artefatos necessários a partir do texto...');
      const artifacts = this._identifyRequiredArtifacts(text);

      if (artifacts.length === 0) {
        return "Não consegui identificar qual tipo de artefato (componente, página, hook, serviço) você deseja criar a partir da descrição. Por favor, seja mais específico.";
      }

      console.log(`Identificados ${artifacts.length} artefatos para geração`);

      let confirmationMessage = `Vou gerar os seguintes artefatos com base na sua descrição:\n`;
      artifacts.forEach(artifact => {
        confirmationMessage += `- ${artifact.type}: ${artifact.name}\n`;
      });

      const confirmation = await vscode.window.showInformationMessage(
        confirmationMessage + `\nDeseja continuar?`,
        'Sim, gerar código',
        'Cancelar'
      );

      if (confirmation !== 'Sim, gerar código') {
        return 'Geração de código cancelada.';
      }

      console.log('Iniciando geração dos artefatos');

      let allFiles: Array<{ path: string; content: string }> = [];

      for (const artifact of artifacts) {
        console.log(`Gerando artefato: ${artifact.type} - ${artifact.name}`);

        try {
          const files = await this._codeGenerationService.generateReactComponent({
            name: artifact.name,
            type: artifact.type,
            description: this._createArtifactDescription(text, artifact),
            path: artifact.path
          });

          allFiles = [...allFiles, ...files];
          console.log(`Artefato ${artifact.name} gerado com sucesso: ${files.length} arquivos`);
        } catch (artifactError) {
          console.error(`Erro ao gerar artefato ${artifact.name}:`, artifactError);
          throw artifactError;
        }
      }

      const fileList = allFiles.map(file => `- ${file.path}`).join('\n');

      console.log('Geração de código concluída com sucesso');

      return `✅ Código gerado com sucesso!\n\nArquivos criados:\n${fileList}\n\nOs arquivos foram criados no workspace e abertos no editor.`;
    } catch (error) {
      console.error('Erro na geração de código:', error);
      throw error;
    }
  }

  private _identifyRequiredArtifacts(
    text: string
  ): Array<{ type: 'component' | 'hook' | 'service' | 'page', name: string, path?: string }> {
    const lowerText = text.toLowerCase();
    const artifacts: Array<{ type: 'component' | 'hook' | 'service' | 'page', name: string, path?: string }> = [];

    let mainType: 'component' | 'hook' | 'service' | 'page' = 'component';
    if (lowerText.includes('página') || lowerText.includes(' page')) {
      mainType = 'page';
    } else if (lowerText.includes('serviço') || lowerText.includes(' service')) {
      mainType = 'service';
    } else if (lowerText.includes(' hook') || lowerText.includes(' custom hook')) {
      mainType = 'hook';
    } else if (lowerText.includes('componente') || lowerText.includes(' component')) {
      mainType = 'component';
    }

    const mainName = this._extractNameFromText(text, mainType) || (mainType.charAt(0).toUpperCase() + mainType.slice(1));
    artifacts.push({ type: mainType, name: mainName });

    if (mainType === 'page' && (lowerText.includes('serviço') || lowerText.includes(' service') || lowerText.includes(' api') || lowerText.includes(' dados'))) {
      if (!artifacts.some(a => a.type === 'service')) {
        let serviceName = `${mainName}Service`;
        if (lowerText.includes('login') || lowerText.includes('auth')) { serviceName = 'AuthService'; }
        if (lowerText.includes('user') || lowerText.includes('usuário')) { serviceName = 'UserService'; }
        artifacts.push({ type: 'service', name: serviceName });
      }
    }

    if (artifacts.length === 0) {
      console.warn("Nenhum artefato identificado em _identifyRequiredArtifacts, retornando componente padrão.");
      artifacts.push({ type: 'component', name: 'MyComponent' });
    }

    return artifacts;
  }

  private _extractNameFromText(text: string, type: string): string {
    const lowerText = text.toLowerCase();

    let patterns: RegExp[] = [];

    switch (type) {
      case 'page':
        patterns = [
          /página\s+de\s+([a-zA-Z]+)/i,
          /página\s+([a-zA-Z]+)/i,
          /([a-zA-Z]+)\s+page/i
        ];
        break;
      case 'component':
        patterns = [
          /componente\s+de\s+([a-zA-Z]+)/i,
          /componente\s+([a-zA-Z]+)/i,
          /([a-zA-Z]+)\s+component/i
        ];
        break;
      case 'service':
        patterns = [
          /serviço\s+de\s+([a-zA-Z]+)/i,
          /serviço\s+([a-zA-Z]+)/i,
          /([a-zA-Z]+)\s+service/i
        ];
        break;
      case 'hook':
        patterns = [
          /hook\s+de\s+([a-zA-Z]+)/i,
          /hook\s+([a-zA-Z]+)/i,
          /use\s*([a-zA-Z]+)/i
        ];
        break;
    }

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }

    if (lowerText.includes('login')) { return 'Login'; }
    if (lowerText.includes('cadastro')) { return 'Cadastro'; }
    if (lowerText.includes('perfil')) { return 'Profile'; }
    if (lowerText.includes('dashboard')) { return 'Dashboard'; }
    if (lowerText.includes('produto')) { return 'Product'; }
    if (lowerText.includes('lista')) { return 'List'; }
    if (lowerText.includes('formulário')) { return 'Form'; }
    if (lowerText.includes('autenticação')) { return 'Auth'; }

    return '';
  }

  private _createArtifactDescription(text: string, artifact: { type: string, name: string }): string {
    let description = text;

    if (artifact.type === 'service' && text.toLowerCase().includes('página') &&
      !text.toLowerCase().includes('serviço')) {
      description += ` Este serviço deve fornecer as funcionalidades de backend necessárias para a página ${artifact.name}.`;
    }

    if (artifact.type === 'hook' && !text.toLowerCase().includes('hook')) {
      description += ` Este hook deve encapsular a lógica de estado e comportamentos necessários.`;
    }

    return description;
  }

  private async _updateWebview() {
    if (this._view) {
      const html = await this._getHtmlForWebview();
      this._view.webview.html = html;
    }
  }

  private async _getHtmlForWebview() {
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

    const provider = vscode.workspace.getConfiguration('psCopilot').get<'openai' | 'azure'>('provider') || 'openai';
    let isConfigOk = false;
    if (provider === 'azure') {
      const azureKey = vscode.workspace.getConfiguration('psCopilot.azure').get<string>('apiKey');
      const azureEndpoint = vscode.workspace.getConfiguration('psCopilot.azure').get<string>('endpoint');
      const azureDeployment = vscode.workspace.getConfiguration('psCopilot.azure').get<string>('deploymentName') || vscode.workspace.getConfiguration('psCopilot').get<string>('model');
      isConfigOk = !!azureKey && !!azureEndpoint && !!azureDeployment;
    } else {
      const apiKey = vscode.workspace.getConfiguration('psCopilot').get<string>('apiKey');
      isConfigOk = !!apiKey;
    }

    let messagesHtml = '';
    if (this._messages.length === 0 && !isConfigOk) {
      messagesHtml = `<div class="empty-state">... Para começar, configure as credenciais ${provider === 'azure' ? 'Azure' : 'OpenAI'} nas Configurações...</div>`;
    } else if (this._messages.length === 0) {
      messagesHtml = `<div class="empty-state">... Bem-vindo! Faça sua pergunta...</div>`;
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

    let modelOptionsHtml = '';
    for (const model of this._availableModels) {
      const selected = model === this._selectedModel ? 'selected' : '';
      modelOptionsHtml += `<option value="${model}" ${selected}>${model}</option>`;
    }

    const scriptContent = `
      const vscode = acquireVsCodeApi();

      const messagesContainer = document.getElementById('messages');
      const textarea = document.getElementById('messageInput');
      const sendButton = document.getElementById('sendButton');
      const modelSelector = document.getElementById('modelSelector');
      const clearButton = document.getElementById('clearButton');

      function adjustTextareaHeight() {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }

      function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      scrollToBottom();
      textarea.focus();

      textarea.addEventListener('input', adjustTextareaHeight);

      function sendMessage() {
        const text = textarea.value.trim();

        if (text) {
          vscode.postMessage({
            command: 'sendMessage',
            text: text
          });

          textarea.value = '';
          textarea.style.height = 'auto';
          textarea.focus();
        }
      }

      sendButton.addEventListener('click', sendMessage);

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      modelSelector.addEventListener('change', (e) => {
        vscode.postMessage({
          command: 'changeModel',
          model: e.target.value
        });
      });

      clearButton.addEventListener('click', () => {
        vscode.postMessage({
          command: 'clearChat'
        });
      });

      scrollToBottom();
    `;

    return `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
          <title>PS Copilot Chat</title>
          <style>
            ${styleContent}
          </style>
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
          <script>
            ${scriptContent}
          </script>
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
