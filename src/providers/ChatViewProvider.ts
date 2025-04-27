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
        console.log('Mensagem recebida do webview:', message);

        switch (message.command) {
          case 'test':
            console.log('Comando de teste recebido do webview!');
            return;

          case 'sendMessage':
            try {
              console.log('Comando sendMessage recebido, texto:', message.text?.length, 'chars');
              if (this._isProcessing) {
                console.log('Ignorando mensagem, já está processando');
                return;
              }

              if (!message.text?.trim()) {
                console.log('Mensagem vazia, ignorando');
                return;
              }

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

              console.log('Processando mensagem...');
              const response = await this._processMessage(message.text);
              console.log('Resposta obtida:', response?.length, 'chars');
              this.addMessage(response, 'assistant');

            } catch (error) {
              console.error('Erro ao processar mensagem:', error);
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
      // Usar análise de intenção baseada em IA através do PromptClassifierAgent
      console.log('Analisando intenção da mensagem com PromptClassifierAgent...');

      try {
        const intentAnalysis = await this._codeGenerationService.analyzeUserIntent(text);
        console.log(`Resultado da análise de intenção: ${intentAnalysis.isCodeGeneration ? 'GERAÇÃO DE CÓDIGO' : 'CONVERSA NORMAL'}`);
        console.log(`Explicação: ${intentAnalysis.explanation}`);

        if (intentAnalysis.isCodeGeneration) {
          // Adicionar mensagem informativa
          this.addMessage(`🤖 Identifiquei que você deseja gerar código: ${intentAnalysis.explanation}`, 'assistant');
          return await this._handleCodeGeneration(text);
        }

        return await this._openAIService.chat(text);
      } catch (intentError) {
        // Se ocorrer erro na análise de intenção, usar chat como fallback
        console.warn('Erro na análise de intenção via PromptClassifierAgent, usando chat como fallback:', intentError);

        return await this._openAIService.chat(text);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      throw error;
    }
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
      const webviewContent = this._getWebviewContent();
      this._view.webview.html = webviewContent;
    }
  }

  private _getWebviewContent() {
    console.log('Gerando conteúdo do webview');

    // Obter o URI do script com o caminho correto
    const scriptUri = this._view!.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
    );

    console.log('URI do script webview:', scriptUri.toString());

    // Dados para passar ao webview
    const webviewData = {
      messages: this._messages || [],
      isProcessing: this._isProcessing || false,
      availableModels: this._availableModels || [],
      selectedModel: this._selectedModel || 'gpt-4o',
      hasApiKey: this._openAIService?.hasApiKey() || false
    };

    console.log('Passando dados para o webview:', {
      messageCount: this._messages.length,
      models: this._availableModels.length,
      isProcessing: this._isProcessing
    });

    // Precisamos converter o objeto Date para string antes de serializar com JSON.stringify
    let serializedData = '{}';
    try {
      serializedData = JSON.stringify(webviewData, (_key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      console.log('Dados serializados com sucesso, tamanho:', serializedData.length);
    } catch (error) {
      console.error('Erro ao serializar dados para webview:', error);
      serializedData = JSON.stringify({
        messages: [],
        isProcessing: false,
        availableModels: this._availableModels || [],
        selectedModel: this._selectedModel || 'gpt-4o',
        hasApiKey: false
      });
    }

    const htmlContent = `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'; img-src ${this._view!.webview.cspSource} https:; script-src ${this._view!.webview.cspSource} 'unsafe-inline' 'unsafe-eval'; style-src ${this._view!.webview.cspSource} 'unsafe-inline';">
          <title>PS Copilot Chat</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 0;
              height: 100vh;
              overflow: hidden;
            }
            #root {
              height: 100%;
            }
            .error-container {
              padding: 20px;
              color: #d32f2f;
              background-color: #fdd;
              border: 1px solid #d32f2f;
              border-radius: 4px;
              margin: 20px;
              font-family: Arial, sans-serif;
            }
            .loading {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100%;
              flex-direction: column;
              color: #666;
            }
            .loading-spinner {
              border: 4px solid rgba(0, 0, 0, 0.1);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border-left-color: #0078d4;
              animation: spin 1s ease infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div id="root">
            <div class="loading">
              <div class="loading-spinner"></div>
              <div>Carregando interface do chat...</div>
            </div>
          </div>

          <!-- Elemento de fallback para os dados do webview -->
          <script id="webview-data" type="application/json">
            ${serializedData}
          </script>

          <script>
            console.log('Script inicializado no HTML do webview');
            try {
              // Garantir que webviewData esteja disponível globalmente
              window.webviewData = ${serializedData};
              console.log('Dados iniciais definidos com sucesso');

              // Verificar campos obrigatórios e aplicar fallbacks se necessário
              if (!window.webviewData || typeof window.webviewData !== 'object') {
                console.warn('webviewData inválido, reinicializando');
                window.webviewData = {};
              }

              if (!Array.isArray(window.webviewData.messages)) {
                window.webviewData.messages = [];
              }

              if (typeof window.webviewData.isProcessing !== 'boolean') {
                window.webviewData.isProcessing = false;
              }

              if (!Array.isArray(window.webviewData.availableModels)) {
                window.webviewData.availableModels = ${JSON.stringify(this._availableModels)};
              }

              if (!window.webviewData.selectedModel) {
                window.webviewData.selectedModel = '${this._selectedModel}';
              }

              if (typeof window.webviewData.hasApiKey !== 'boolean') {
                window.webviewData.hasApiKey = ${this._openAIService?.hasApiKey() || false};
              }

              console.log('Webview dados disponíveis:', {
                messageCount: window.webviewData.messages?.length || 0,
                models: window.webviewData.availableModels?.length || 0
              });
            } catch (e) {
              console.error('Erro ao inicializar dados do webview:', e);
              document.getElementById('root').innerHTML = '<div class="error-container">Erro ao inicializar dados do chat. Por favor, recarregue. Detalhes: ' + (e.message || 'Erro desconhecido') + '</div>';
            }

            // Verificar se o script principal carregou
            let scriptLoaded = false;
            window.addEventListener('error', function(e) {
              console.error('Erro detectado:', e);
              if (e.target && e.target.tagName === 'SCRIPT') {
                console.error('Erro ao carregar script:', e);
                if (!scriptLoaded) {
                  document.getElementById('root').innerHTML = '<div class="error-container">Erro ao carregar recursos necessários. Por favor, recarregue a extensão.<br>Detalhes: ' + e.message + '</div>';
                }
              }
            }, true);

            // Timeout para verificar se o script carregou
            setTimeout(function() {
              if (!scriptLoaded && document.querySelector('.loading')) {
                console.error('Timeout - script não carregou em 5 segundos');
                document.getElementById('root').innerHTML = '<div class="error-container">Tempo limite excedido ao carregar a interface. Por favor, recarregue a extensão.</div>';
              }
            }, 5000);
          </script>
          <script src="${scriptUri}" onerror="document.getElementById('root').innerHTML = '<div class=\\'error-container\\'>Erro ao carregar o script da interface. Por favor, recarregue a extensão.</div>';" onload="scriptLoaded = true;"></script>
        </body>
      </html>`;

    console.log('HTML gerado com sucesso');
    return htmlContent;
  }
}
