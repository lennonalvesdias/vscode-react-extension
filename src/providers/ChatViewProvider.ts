import * as vscode from 'vscode';
import { OpenAIService } from '../services/OpenAIService';
import { CodeGenerationService } from '../services/CodeGenerationService';
import { ChatCompletionMessageParam } from 'openai/resources';

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

  /**
   * Obtém o código selecionado pelo usuário ou o conteúdo do arquivo atual
   * @returns Um objeto contendo o contexto e informações sobre a sua origem
   */
  private async getCodeContext(): Promise<{ code: string, source: string, language: string } | null> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      console.log('Nenhum editor ativo encontrado');
      return null;
    }

    // Verificar se há texto selecionado
    const selection = editor.selection;
    const document = editor.document;
    const fileName = document.fileName.split(/[\\/]/).pop() || 'desconhecido';
    const language = document.languageId;

    if (!selection.isEmpty) {
      // Se houver seleção, usa o texto selecionado como contexto
      const selectedText = document.getText(selection);
      if (selectedText.trim().length > 0) {
        console.log(`Contexto obtido: ${selectedText.length} caracteres de código selecionado`);
        return {
          code: selectedText,
          source: `Seleção em ${fileName}`,
          language
        };
      }
    }

    // Se não houver seleção ou a seleção estiver vazia, usa o conteúdo do arquivo
    const fileContent = document.getText();
    if (fileContent.trim().length > 0) {
      // Aplicar truncamento inteligente para arquivos grandes (limite de 10K caracteres)
      let truncatedContent = fileContent;
      const maxLength = 10000;

      if (fileContent.length > maxLength) {
        console.log(`Arquivo grande (${fileContent.length} chars), aplicando truncamento`);

        // Tentar identificar a posição do cursor
        const cursorPosition = editor.selection.active;
        const cursorOffset = document.offsetAt(cursorPosition);

        // Extrair a região ao redor do cursor
        const regionStart = Math.max(0, cursorOffset - maxLength / 2);
        const regionEnd = Math.min(fileContent.length, cursorOffset + maxLength / 2);

        truncatedContent = fileContent.substring(regionStart, regionEnd);

        // Adicionar indicadores de truncamento
        if (regionStart > 0) {
          truncatedContent = `/* ... início do arquivo truncado ... */\n${truncatedContent}`;
        }
        if (regionEnd < fileContent.length) {
          truncatedContent = `${truncatedContent}\n/* ... restante do arquivo truncado ... */`;
        }
      }

      console.log(`Contexto obtido: ${truncatedContent.length} caracteres do arquivo ${fileName}`);
      return {
        code: truncatedContent,
        source: `Arquivo ${fileName}`,
        language
      };
    }

    return null;
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
      // Obter o contexto do código atual (seleção ou arquivo)
      const codeContext = await this.getCodeContext();

      // Modificar a mensagem do usuário para incluir o contexto, se disponível
      let messageWithContext = text;
      if (codeContext) {
        messageWithContext = `
${text}

===== CONTEXTO DO CÓDIGO (${codeContext.source}, linguagem: ${codeContext.language}) =====
\`\`\`${codeContext.language}
${codeContext.code}
\`\`\`
`;
        console.log(`Contexto adicionado à mensagem: ${codeContext.source} (${codeContext.code.length} caracteres)`);
      }

      // Usar processCodeGenerationRequest para determinar a intenção do usuário
      console.log('Processando mensagem do usuário...');

      try {
        // Criar um callback para exibir status em tempo real ao usuário
        const statusCallback = (status: string) => {
          // Adicionar mensagem de status como resposta do assistente, com prefixo de status
          this.addMessage(status, 'assistant');
        };

        const result = await this._codeGenerationService.processCodeGenerationRequest(messageWithContext, statusCallback);

        // Se for uma intenção de geração de código bem-sucedida
        if (result.success && result.result) {
          // Preparar a lista de arquivos gerados
          const fileList = result.result.map(file => `- ${file.path}`).join('\n');

          // Abrir o arquivo principal no editor
          if (result.result.length > 0) {
            try {
              // Geralmente o primeiro arquivo é o principal (componente, hook, etc.)
              const mainFile = result.result[0];
              const mainFilePath = vscode.Uri.file(
                vscode.workspace.workspaceFolders![0].uri.fsPath + '/' + mainFile.path
              );
              await vscode.workspace.openTextDocument(mainFilePath).then(doc => {
                vscode.window.showTextDocument(doc);
              });
            } catch (openError) {
              console.error('Erro ao abrir arquivo no editor:', openError);
            }
          }

          // Adicionar mensagem informativa sobre o sucesso da geração
          return `✅ Processo de geração concluído!\n\nArquivos criados:\n${fileList}\n\nO arquivo principal foi aberto no editor.`;
        }
        // Se for intenção de geração, mas houve algum erro específico
        else if (!result.success && result.error) {
          // Verificar se é um erro indicando que não é uma solicitação de geração
          if (result.error.includes("não parece ser uma solicitação de geração de código")) {
            // É uma mensagem de conversa normal, usar chat
            // Converter o histórico de mensagens para o formato esperado pela API
            const chatHistory = this._convertMessagesToApiFormat();
            return await this._openAIService.chat(messageWithContext, chatHistory);
          } else {
            // Adicionar feedback sobre o erro antes de continuar com chat
            this.addMessage(`❌ ${result.error}`, 'assistant');
            // Converter o histórico de mensagens para o formato esperado pela API
            const chatHistory = this._convertMessagesToApiFormat();
            return await this._openAIService.chat(messageWithContext, chatHistory);
          }
        }

        // Fallback para chat padrão se algo inesperado acontecer
        const chatHistory = this._convertMessagesToApiFormat();
        return await this._openAIService.chat(messageWithContext, chatHistory);
      } catch (error) {
        // Erro no processamento, usar chat como fallback
        console.warn('Erro ao processar intenção, usando chat como fallback:', error);
        const chatHistory = this._convertMessagesToApiFormat();
        return await this._openAIService.chat(messageWithContext, chatHistory);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      throw error;
    }
  }

  /**
   * Converte as mensagens armazenadas no formato interno para o formato esperado pela API da OpenAI
   * Excluindo a mensagem mais recente (do usuário) que será adicionada separadamente
   */
  private _convertMessagesToApiFormat(): ChatCompletionMessageParam[] {
    // Pegar todas as mensagens exceto a última (que é a mensagem atual do usuário)
    // Limite a 10 mensagens anteriores para evitar tokens excessivos
    const messagesToInclude = this._messages.slice(0, -1).slice(-10);

    return messagesToInclude.map(msg => ({
      role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.text
    }));
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
