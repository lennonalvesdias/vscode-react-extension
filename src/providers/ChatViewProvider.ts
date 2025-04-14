import * as vscode from 'vscode';
import { OpenAIService } from '../services/OpenAIService';
import { AgentContext } from '../agents/types';
import { ConfigurationService } from '../services/ConfigurationService';
import { onApiKeyConfigured } from '../extension';
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
  private _selectedModel = 'gpt-3.5-turbo';
  private _availableModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o'
  ];
  private _openAIService: OpenAIService;
  private _configService: ConfigurationService;
  private _codeGenerationService: CodeGenerationService;
  private _isProcessing = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    // Carregar modelo selecionado das configurações
    this._selectedModel = this._context.globalState.get<string>('selectedModel') || 'gpt-3.5-turbo';

    // Carregar URL da API das configurações
    const config = vscode.workspace.getConfiguration('psCopilot');
    const customApiUrl = config.get<string>('apiUrl');

    // Inicializar serviços
    const agentContext: AgentContext = {
      apiKey: '', // Será carregado em _loadApiKey
      model: this._selectedModel,
      apiUrl: customApiUrl || undefined, // Usar URL customizada ou undefined
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      extensionUri: _extensionUri,
      extensionPath: _extensionUri.fsPath,
      globalState: _context.globalState,
      workspaceState: _context.workspaceState,
      configuration: config // Passar a configuração lida
    };

    this._configService = new ConfigurationService(agentContext);
    this._openAIService = new OpenAIService(agentContext);
    this._codeGenerationService = new CodeGenerationService(agentContext);

    // Carregar API Key (isso também recriará os serviços com a key)
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

    // Escutar eventos de configuração da API Key
    onApiKeyConfigured(() => {
      // Recarregar a API Key
      this._loadApiKey();

      // Atualizar a interface para refletir que a API Key foi configurada
      this._updateWebview();

      // Adicionar mensagem informativa
      this._messages.push({
        text: 'API Key configurada com sucesso! Agora você pode começar a fazer perguntas.',
        sender: 'assistant',
        timestamp: new Date()
      });

      // Atualizar a interface novamente para mostrar a nova mensagem
      this._updateWebview();
    });
  }

  private async _loadApiKey() {
    try {
      const apiKey = await this._configService.getApiKey();
      // Carregar URL da API das configurações novamente
      const config = vscode.workspace.getConfiguration('psCopilot');
      const customApiUrl = config.get<string>('apiUrl');

      // Atualizar agentContext com a API Key e a URL mais recente
      const agentContext: AgentContext = {
        apiKey: apiKey || '', // Garante que apiKey não seja null
        model: this._selectedModel,
        apiUrl: customApiUrl || undefined,
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30000,
        extensionUri: this._extensionUri,
        extensionPath: this._extensionUri.fsPath,
        globalState: this._context.globalState,
        workspaceState: this._context.workspaceState,
        configuration: config
      };

      // Atualizar/Recriar os serviços com o contexto atualizado
      this._openAIService = new OpenAIService(agentContext);
      this._codeGenerationService = new CodeGenerationService(agentContext);

      if (apiKey) {
        console.log('API Key e URL carregadas e serviços atualizados com sucesso');
      } else {
        console.log('Nenhuma API Key encontrada, usando URL padrão/configurada');
      }
    } catch (error) {
      console.error('Erro ao carregar API Key/URL:', error);
    }
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

    // Defina um título para a view
    webviewView.description = "Assistente com múltiplos agentes";

    // Renderize o HTML da view
    await this._updateWebview();

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
              await this._updateWebview();

              // Define o estado como processando
              this._isProcessing = true;
              await this._updateWebview();

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
              await this._updateWebview();
            } catch (error) {
              this._isProcessing = false;
              vscode.window.showErrorMessage('Erro ao processar mensagem: ' + error);
              await this._updateWebview();
            }
            break;
          case 'clearChat':
            this._messages = [];
            await this._updateWebview();
            break;
          case 'changeModel':
            this._selectedModel = message.model;
            this._context.globalState.update('selectedModel', this._selectedModel);
            vscode.window.showInformationMessage(`Modelo alterado para: ${this._selectedModel}`);
            await this._updateWebview();
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

      // Verifica se a mensagem é um pedido para gerar código
      if (this._isCodeGenerationRequest(text)) {
        return await this._handleCodeGeneration(text);
      }

      // Processa a mensagem com o OpenAI
      return await this._openAIService.chat(text);
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

  /**
   * Verifica se a mensagem é uma solicitação de geração de código
   */
  private _isCodeGenerationRequest(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Padrões de frases que indicam solicitação de geração de código
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

  /**
   * Processa a solicitação de geração de código
   */
  private async _handleCodeGeneration(text: string): Promise<string> {
    try {
      // Verificar se tem API Key configurada
      const apiKey = await this._configService.getApiKey();
      // Carregar URL da API das configurações
      const config = vscode.workspace.getConfiguration('psCopilot');
      const customApiUrl = config.get<string>('apiUrl');

      if (!apiKey) {
        // Mostrar opção para configurar a API Key
        vscode.window.showErrorMessage(
          'API Key da OpenAI não configurada',
          'Configurar API Key'
        ).then(selection => {
          if (selection === 'Configurar API Key') {
            vscode.commands.executeCommand('psCopilot.configureApiKey');
          }
        });

        return 'Não foi possível gerar o código porque a API Key não está configurada. Por favor, clique no botão "Configurar API Key" na notificação acima ou use o comando "PS Copilot: Configurar API Key da OpenAI" na paleta de comandos (Ctrl+Shift+P).';
      }

      // Verificar se há um workspace aberto
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return 'Não foi possível gerar o código porque nenhum workspace está aberto. Abra um projeto para gerar código.';
      }

      // Assegurar que os serviços tenham o contexto mais recente
      const agentContext: AgentContext = {
        apiKey: apiKey,
        model: this._selectedModel,
        apiUrl: customApiUrl || undefined,
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30000,
        extensionUri: this._extensionUri,
        extensionPath: this._extensionUri.fsPath,
        globalState: this._context.globalState,
        workspaceState: this._context.workspaceState,
        configuration: config
      };

      // Recria os serviços com o contexto atualizado
      this._openAIService = new OpenAIService(agentContext);
      this._codeGenerationService = new CodeGenerationService(agentContext);

      console.log('Identificando artefatos necessários a partir do texto...');
      const artifacts = this._identifyRequiredArtifacts(text);

      if (artifacts.length === 0) {
        return "Não consegui identificar qual tipo de artefato (componente, página, hook, serviço) você deseja criar a partir da descrição. Por favor, seja mais específico.";
      }

      console.log(`Identificados ${artifacts.length} artefatos para geração`);

      // Solicitar confirmação do usuário
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

      // Resultados de todos os artefatos gerados
      let allFiles: Array<{ path: string; content: string }> = [];

      // Gerar cada artefato
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

      // Lista de arquivos gerados
      const fileList = allFiles.map(file => `- ${file.path}`).join('\n');

      console.log('Geração de código concluída com sucesso');

      return `✅ Código gerado com sucesso!\n\nArquivos criados:\n${fileList}\n\nOs arquivos foram criados no workspace e abertos no editor.`;
    } catch (error) {
      console.error('Erro na geração de código:', error);

      // Se o erro for de API Key não configurada, mostrar opção para configurar
      if (error instanceof Error && error.message.includes('API Key não configurada')) {
        vscode.window.showErrorMessage(
          'API Key da OpenAI não configurada',
          'Configurar API Key'
        ).then(selection => {
          if (selection === 'Configurar API Key') {
            vscode.commands.executeCommand('psCopilot.configureApiKey');
          }
        });

        return `❌ Erro ao gerar código: API Key não configurada. Por favor, clique no botão "Configurar API Key" na notificação acima ou use o comando "PS Copilot: Configurar API Key da OpenAI" na paleta de comandos (Ctrl+Shift+P).`;
      }

      return `❌ Erro ao gerar código: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  /**
   * Identifica os artefatos necessários com base na descrição do usuário
   */
  private _identifyRequiredArtifacts(
    text: string
  ): Array<{ type: 'component' | 'hook' | 'service' | 'page', name: string, path?: string }> {
    const lowerText = text.toLowerCase();
    const artifacts: Array<{ type: 'component' | 'hook' | 'service' | 'page', name: string, path?: string }> = [];

    // Simplificar a lógica para depender menos do analysisResult (que agora é {})
    // A lógica existente já tem fallbacks que usam o texto, então deve funcionar.
    // Idealmente, esta função poderia ser refatorada ou substituída por uma análise mais robusta no futuro.

    // Exemplo: Usar o fallback de análise de texto primeiro
    let mainType: 'component' | 'hook' | 'service' | 'page' = 'component'; // Default
    if (lowerText.includes('página') || lowerText.includes(' page')) {
      mainType = 'page';
    } else if (lowerText.includes('serviço') || lowerText.includes(' service')) {
      mainType = 'service';
    } else if (lowerText.includes(' hook') || lowerText.includes(' custom hook')) { // Mais específico para hook
      mainType = 'hook';
    } else if (lowerText.includes('componente') || lowerText.includes(' component')) {
      mainType = 'component';
    }

    const mainName = this._extractNameFromText(text, mainType) || (mainType.charAt(0).toUpperCase() + mainType.slice(1)); // Nome baseado no tipo ou extraído
    artifacts.push({ type: mainType, name: mainName });

    // Adicionar lógica simplificada para detectar serviços ou hooks relacionados (se necessário)
    if (mainType === 'page' && (lowerText.includes('serviço') || lowerText.includes(' service') || lowerText.includes(' api') || lowerText.includes(' dados'))) {
      // Se a página menciona serviço/api/dados, adicionar um serviço relacionado
      if (!artifacts.some(a => a.type === 'service')) {
        let serviceName = `${mainName}Service`; // Nome baseado na página
        if (lowerText.includes('login') || lowerText.includes('auth')) { serviceName = 'AuthService'; }
        if (lowerText.includes('user') || lowerText.includes('usuário')) { serviceName = 'UserService'; }
        artifacts.push({ type: 'service', name: serviceName });
      }
    }
    // Adicionar outras lógicas de detecção simplificadas conforme necessário

    // Manter a lógica de fallback restante que usa lowerText
    // ... (código existente para detectar page+service, hooks)

    // Garantir que pelo menos um artefato seja retornado (a lógica acima já faz isso)
    if (artifacts.length === 0) {
      console.warn("Nenhum artefato identificado em _identifyRequiredArtifacts, retornando componente padrão.");
      artifacts.push({ type: 'component', name: 'MyComponent' });
    }

    return artifacts;
  }

  /**
   * Tenta extrair um nome de componente a partir do texto
   */
  private _extractNameFromText(text: string, type: string): string {
    const lowerText = text.toLowerCase();

    // Padrões para extração baseados no tipo
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

    // Tentar cada padrão
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Capitalizar a primeira letra
        return match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }

    // Extrair algumas palavras-chave comuns
    if (lowerText.includes('login')) { return 'Login'; }
    if (lowerText.includes('cadastro')) { return 'Cadastro'; }
    if (lowerText.includes('perfil')) { return 'Profile'; }
    if (lowerText.includes('dashboard')) { return 'Dashboard'; }
    if (lowerText.includes('produto')) { return 'Product'; }
    if (lowerText.includes('lista')) { return 'List'; }
    if (lowerText.includes('formulário')) { return 'Form'; }
    if (lowerText.includes('autenticação')) { return 'Auth'; }

    // Retornar null se não encontrar
    return '';
  }

  /**
   * Cria uma descrição detalhada para o artefato
   */
  private _createArtifactDescription(text: string, artifact: { type: string, name: string }): string {
    let description = text;

    // Adicionar contexto específico para o artefato
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

    // Adiciona estilos para o estado vazio se tiver API Key
    const hasApiKey = await this._configService.hasApiKey();

    // Renderiza as mensagens
    let messagesHtml = '';

    if (this._messages.length === 0) {
      messagesHtml = `
        <div class="empty-state">
          <h3>Bem-vindo ao PS Copilot</h3>
          <p>
            Assistente de desenvolvimento React com múltiplos agentes especializados.<br>
            Faça perguntas sobre desenvolvimento, design, arquitetura ou testes.<br><br>
            <strong>Exemplos de comandos:</strong><br>
            • "Crie um componente de botão com variações de tamanho e cor"<br>
            • "Desenvolva um hook para gerenciar autenticação com JWT"<br>
            • "Implemente um serviço para comunicação com a API de produtos"<br>
            • "Crie uma página de dashboard com gráficos e filtros"
          </p>
          ${!hasApiKey ? `
          <div class="empty-state-actions">
            <button id="configApiKeyBtn" class="action-button">Configurar API Key</button>
          </div>
          ` : ''}
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
