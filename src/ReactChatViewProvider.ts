import * as vscode from 'vscode';
import { ReactCodeGenerator } from './utils/codeGenerator';
import { baseStyles, buttonStyles, inputStyles, messageStyles } from './design-system';
import { colors } from './design-system/tokens/colors';
import { spacing } from './design-system/tokens/spacing';

interface ChatStats {
    filesCreated: number;
    filesModified: number;
    componentsGenerated: number;
    lastModified: string[];
}

interface ChatMessage {
    type: 'user' | 'assistant' | 'error' | 'code' | 'system' | 'suggestion' | 'stats' | 'thinking';
    text: string;
    timestamp: number;
    metadata?: {
        fileCreated?: string;
        fileModified?: string;
        componentType?: string;
        action?: string;
        currentFile?: string;
        suggestions?: string[];
        codeLanguage?: string;
        stats?: ChatStats;
        undoAvailable?: boolean;
        stage?: 'analyzing' | 'generating' | 'formatting' | 'complete';
    };
}

export class ReactChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'reactChatView';
    private _view?: vscode.WebviewView;
    private codeGenerator: ReactCodeGenerator;
    private static readonly CHAT_HISTORY_KEY = 'reactChatHistory';
    private static readonly CHAT_STATS_KEY = 'reactChatStats';
    private currentFile?: string;
    private stats: ChatStats = {
        filesCreated: 0,
        filesModified: 0,
        componentsGenerated: 0,
        lastModified: []
    };

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        this.codeGenerator = new ReactCodeGenerator();
        this.setupFileChangeListener();
        this.loadStats();
    }

    private async loadStats() {
        const savedStats = this._context.globalState.get<ChatStats>(ReactChatViewProvider.CHAT_STATS_KEY);
        if (savedStats) {
            this.stats = savedStats;
        }
    }

    private async updateStats(action: 'create' | 'modify', fileName: string) {
        if (action === 'create') {
            this.stats.filesCreated++;
        } else {
            this.stats.filesModified++;
        }
        
        // Manter apenas os últimos 5 arquivos modificados
        this.stats.lastModified = [fileName, ...this.stats.lastModified.slice(0, 4)];
        
        await this._context.globalState.update(ReactChatViewProvider.CHAT_STATS_KEY, this.stats);
        
        // Enviar atualização para o webview
        this.sendStatsUpdate();
    }

    private async sendStatsUpdate() {
        if (this._view) {
            const statsMessage = this.formatStats();
            await this.saveMessage({
                type: 'stats',
                text: statsMessage,
                timestamp: Date.now(),
                metadata: { stats: this.stats }
            });
            
            this._view.webview.postMessage({
                type: 'statsUpdate',
                stats: this.stats,
                text: statsMessage
            });
        }
    }

    private formatStats(): string {
        return `📊 Estatísticas do Projeto:
• Arquivos Criados: ${this.stats.filesCreated}
• Arquivos Modificados: ${this.stats.filesModified}
• Componentes Gerados: ${this.stats.componentsGenerated}
${this.stats.lastModified.length > 0 ? '\n📝 Últimas Modificações:\n' + this.stats.lastModified.map(f => `• ${f}`).join('\n') : ''}`;
    }

    private setupFileChangeListener() {
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                const fileName = editor.document.fileName;
                if (fileName !== this.currentFile) {
                    this.currentFile = fileName;
                    this.addSystemMessage(`📁 Contexto alterado para: ${fileName.split('/').pop()}`);
                }
            }
        });
    }

    private async saveMessage(message: ChatMessage): Promise<void> {
        try {
            const history = await this.getChatHistory();
            history.push(message);
            console.log('Salvando mensagem no histórico:', message.type);
            await this._context.globalState.update(ReactChatViewProvider.CHAT_HISTORY_KEY, history);
            
            // Atualizar estatísticas se necessário
            if (message.type === 'stats') {
                await this._context.globalState.update(ReactChatViewProvider.CHAT_STATS_KEY, message.metadata?.stats);
            }
            
            // Enviar mensagem para o webview
            if (this._view) {
                this._view.webview.postMessage({ type: 'newMessage', message });
            }
        } catch (error) {
            console.error('Erro ao salvar mensagem:', error);
            throw new Error('Não foi possível salvar a mensagem no histórico');
        }
    }

    private async getChatHistory(): Promise<ChatMessage[]> {
        try {
            const history = this._context.globalState.get<ChatMessage[]>(ReactChatViewProvider.CHAT_HISTORY_KEY, []);
            console.log('Histórico carregado:', history?.length || 0, 'mensagens');
            return history || [];
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            return [];
        }
    }

    private async clearHistory(): Promise<void> {
        try {
            console.log('Limpando histórico do chat');
            await this._context.globalState.update(ReactChatViewProvider.CHAT_HISTORY_KEY, []);
            await this._context.globalState.update(ReactChatViewProvider.CHAT_STATS_KEY, undefined);
            
            if (this._view) {
                this._view.webview.postMessage({ type: 'clearHistory' });
                this.addSystemMessage('Histórico limpo com sucesso! 🧹');
            }
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            throw new Error('Não foi possível limpar o histórico');
        }
    }

    private async addSystemMessage(text: string, suggestions?: string[]) {
        await this.saveMessage({ 
            type: 'system', 
            text, 
            timestamp: Date.now(),
            metadata: { suggestions }
        });
        if (this._view) {
            this._view.webview.postMessage({ 
                type: 'system', 
                text,
                metadata: { suggestions }
            });
        }
    }

    private getSuggestionsForContext(): string[] {
        const fileName = this.currentFile?.toLowerCase() || '';
        
        if (fileName.includes('component')) {
            return [
                "Adicione validação de props usando PropTypes",
                "Converta para componente funcional com hooks",
                "Adicione testes unitários para este componente",
                "Otimize o performance com useMemo/useCallback"
            ];
        }
        
        if (fileName.includes('service')) {
            return [
                "Adicione tratamento de erros",
                "Implemente cache de requisições",
                "Adicione interceptors para refresh token",
                "Crie tipos/interfaces para as respostas"
            ];
        }

        if (fileName.includes('test')) {
            return [
                "Adicione casos de teste para erros",
                "Crie mocks para as dependências",
                "Adicione testes de integração",
                "Teste casos de borda"
            ];
        }

        return [
            "Crie um novo componente React",
            "Adicione um serviço de API",
            "Crie um hook personalizado",
            "Implemente um contexto global"
        ];
    }

    public async generateResponse(request: string): Promise<void> {
        try {
            // Adicionar mensagem do usuário
            await this.saveMessage({ 
                type: 'user', 
                text: request,
                timestamp: Date.now()
            });

            // Adicionar mensagem de "pensando"
            await this.saveMessage({
                type: 'thinking',
                text: 'Analisando sua solicitação...',
                timestamp: Date.now(),
                metadata: { stage: 'analyzing' }
            });

            // Atualizar UI para mostrar que está processando
            this._view?.webview.postMessage({ type: 'loading', show: true });

            // Processar a solicitação em etapas
            const stages = [
                { stage: 'analyzing', text: 'Analisando estrutura do projeto...' },
                { stage: 'generating', text: 'Gerando código...' },
                { stage: 'formatting', text: 'Formatando resposta...' }
            ];

            for (const { stage, text } of stages) {
                await this.saveMessage({
                    type: 'thinking',
                    text,
                    timestamp: Date.now(),
                    metadata: { stage }
                });
                
                // Simular um pequeno delay para feedback visual
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Gerar a resposta
            const result = await this.codeGenerator.generateComponent(request);
            const codeLanguage = result.toLowerCase().includes('typescript') ? 'typescript' : 'javascript';

            // Remover mensagens de "pensando"
            const history = await this.getChatHistory();
            const filteredHistory = history.filter(msg => msg.type !== 'thinking');
            await this._context.globalState.update(ReactChatViewProvider.CHAT_HISTORY_KEY, filteredHistory);

            // Adicionar resposta final
            await this.saveMessage({
                type: 'assistant',
                text: result,
                timestamp: Date.now(),
                metadata: {
                    action: 'generate',
                    componentType: 'react',
                    codeLanguage,
                    stage: 'complete',
                    suggestions: this.getSuggestionsForContext()
                }
            });

            // Atualizar UI
            this._view?.webview.postMessage({
                type: 'response',
                text: result,
                metadata: {
                    action: 'generate',
                    componentType: 'react',
                    codeLanguage,
                    stage: 'complete',
                    suggestions: this.getSuggestionsForContext()
                }
            });

        } catch (error) {
            console.error('Erro ao gerar resposta:', error);
            await this.saveMessage({
                type: 'error',
                text: `Erro ao processar sua solicitação: ${error.message}`,
                timestamp: Date.now()
            });
        } finally {
            // Esconder indicador de loading
            this._view?.webview.postMessage({ type: 'loading', show: false });
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Carregar histórico após o webview estar pronto
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'webviewReady') {
                const history = await this.getChatHistory();
                if (history && history.length > 0) {
                    console.log('Carregando histórico:', history.length, 'mensagens');
                    webviewView.webview.postMessage({ type: 'loadHistory', history });
                } else {
                    console.log('Nenhum histórico encontrado, mostrando mensagem inicial');
                    this.addSystemMessage('👋 Bem-vindo ao React Chat! Aqui estão alguns exemplos do que você pode fazer:', [
                        'Crie um componente de tabela de usuários com paginação e busca',
                        'Edite o componente UserList para adicionar ordenação por coluna',
                        'Crie um serviço de autenticação com JWT',
                        'Adicione integração com a API REST https://api.exemplo.com/users',
                        'Crie um formulário de cadastro com validação Yup'
                    ]);
                }
            } else if (message.command === 'generate') {
                await this.generateResponse(message.text);
            } else if (message.command === 'clearHistory') {
                await this.clearHistory();
            } else if (message.command === 'copyCode') {
                await vscode.env.clipboard.writeText(message.code);
                webviewView.webview.postMessage({ type: 'notification', text: 'Código copiado!' });
            } else if (message.command === 'useSuggestion') {
                const suggestion = message.suggestion;
                webviewView.webview.postMessage({ 
                    type: 'setInput', 
                    text: suggestion 
                });
            } else if (message.command === 'showStats') {
                this._view?.webview.postMessage({ command: 'showStats' });
            } else if (message.command === 'undo') {
                this._view?.webview.postMessage({ command: 'undo' });
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>React Chat</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }

                #chat {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .message {
                    display: flex;
                    gap: 8px;
                    padding: 8px 0;
                    line-height: 1.6;
                    font-size: 13px;
                }

                .message-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    flex-shrink: 0;
                }

                .user-message .message-avatar {
                    background: var(--vscode-textLink-foreground);
                    color: white;
                }

                .assistant-message .message-avatar {
                    background: var(--vscode-symbolIcon-classForeground);
                    color: white;
                }

                .message-content {
                    flex: 1;
                    overflow-x: auto;
                }

                .code-block {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editor-lineHighlightBorder);
                    border-radius: 6px;
                    margin: 8px 0;
                }

                .code-block-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 12px;
                    background: var(--vscode-editor-lineHighlightBackground);
                    border-bottom: 1px solid var(--vscode-editor-lineHighlightBorder);
                    font-size: 12px;
                }

                .code-block pre {
                    margin: 0;
                    padding: 12px;
                    overflow-x: auto;
                    font-family: 'SF Mono', Monaco, Menlo, Consolas, 'Ubuntu Mono', monospace;
                    font-size: 12px;
                }

                .input-container {
                    border-top: 1px solid var(--vscode-editor-lineHighlightBorder);
                    padding: 12px;
                    background: var(--vscode-editor-background);
                }

                .input-box {
                    display: flex;
                    gap: 8px;
                    padding: 8px;
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                }

                #userInput {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 13px;
                    line-height: 1.6;
                    resize: none;
                    padding: 0;
                    height: 24px;
                    max-height: 200px;
                    outline: none;
                }

                .input-actions {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .action-button {
                    padding: 4px 8px;
                    background: transparent;
                    border: none;
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    border-radius: 4px;
                }

                .action-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .action-button.primary {
                    background: var(--vscode-button-background);
                }

                .action-button.primary:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .input-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 8px;
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                }

                .suggestions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 8px;
                }

                .suggestion-chip {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    cursor: pointer;
                    border: 1px solid var(--vscode-button-border);
                }

                .suggestion-chip:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }

                .loading {
                    width: 14px;
                    height: 14px;
                    border: 2px solid var(--vscode-button-foreground);
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to {transform: rotate(360deg);}
                }

                .welcome-message {
                    text-align: center;
                    padding: 2rem;
                    color: var(--vscode-descriptionForeground);
                }

                .welcome-message h1 {
                    font-size: 24px;
                    margin-bottom: 1rem;
                    color: var(--vscode-editor-foreground);
                }

                .welcome-message p {
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }

                .thinking-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    border-radius: 6px;
                    font-size: 13px;
                    color: var(--vscode-descriptionForeground);
                }

                .thinking-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .thinking-dot {
                    width: 4px;
                    height: 4px;
                    background: var(--vscode-textLink-foreground);
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }

                .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
                .thinking-dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                }

                .stage-indicator {
                    font-size: 12px;
                    color: var(--vscode-textLink-foreground);
                    margin-left: 8px;
                }

                .error-message {
                    background: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 8px;
                    border-radius: 4px;
                    margin: 8px 0;
                }

                .status-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 4px 8px;
                    font-size: 12px;
                    background: var(--vscode-statusBar-background);
                    color: var(--vscode-statusBar-foreground);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 1000;
                }

                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--vscode-statusBarItem-prominentBackground);
                }

                .status-dot.active {
                    animation: blink 1s infinite;
                }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            </style>
        </head>
        <body>
            <div id="chat">
                <div class="welcome-message">
                    <h1>React Chat</h1>
                    <p>Assistente alimentado por IA para ajudar você a criar e modificar código React.<br>
                    Revise cuidadosamente o código gerado antes de usar.</p>
                    <p>Digite / para ver os comandos disponíveis</p>
                </div>
            </div>
            
            <div class="input-container">
                <div class="input-box">
                    <textarea id="userInput" 
                        placeholder="Pergunte algo sobre React ou peça para gerar código..."
                        rows="1"></textarea>
                    <div class="input-actions">
                        <button class="action-button" id="clearBtn" title="Limpar histórico">
                            <span class="codicon codicon-clear-all"></span>
                        </button>
                        <button class="action-button primary" id="sendBtn">
                            <span class="loading" style="display: none;"></span>
                            <span>Enviar</span>
                        </button>
                    </div>
                </div>
                <div class="input-footer">
                    <span>Enter ⏎ para enviar, Shift+Enter para nova linha</span>
                </div>
            </div>

            <div class="status-bar" style="display: none;">
                <div class="status-indicator">
                    <div class="status-dot"></div>
                    <span class="status-text">Pronto</span>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                const chatDiv = document.getElementById('chat');
                const input = document.getElementById('userInput');
                const sendBtn = document.getElementById('sendBtn');
                const clearBtn = document.getElementById('clearBtn');
                const loading = sendBtn.querySelector('.loading');
                const statusBar = document.querySelector('.status-bar');
                const statusDot = statusBar.querySelector('.status-dot');
                const statusText = statusBar.querySelector('.status-text');

                // Notificar que o webview está pronto
                window.addEventListener('load', () => {
                    vscode.postMessage({ command: 'webviewReady' });
                });

                function formatTimestamp(timestamp) {
                    return new Date(timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }

                function createCodeBlock(code, language = '') {
                    const container = document.createElement('div');
                    container.className = 'code-block';
                    
                    const header = document.createElement('div');
                    header.className = 'code-block-header';
                    
                    const langSpan = document.createElement('span');
                    langSpan.textContent = language || 'código';
                    
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-button';
                    copyBtn.innerHTML = '📋 Copiar';
                    copyBtn.onclick = () => {
                        vscode.postMessage({ 
                            command: 'copyCode',
                            code: code
                        });
                    };
                    
                    header.appendChild(langSpan);
                    header.appendChild(copyBtn);
                    
                    const pre = document.createElement('pre');
                    pre.textContent = code;
                    
                    container.appendChild(header);
                    container.appendChild(pre);
                    return container;
                }

                function createSuggestions(suggestions) {
                    if (!suggestions || !suggestions.length) return null;
                    
                    const container = document.createElement('div');
                    container.className = 'suggestions';
                    
                    suggestions.forEach(suggestion => {
                        const chip = document.createElement('span');
                        chip.className = 'suggestion-chip';
                        chip.textContent = suggestion;
                        chip.onclick = () => {
                            vscode.postMessage({
                                command: 'useSuggestion',
                                suggestion: suggestion
                            });
                        };
                        container.appendChild(chip);
                    });
                    
                    return container;
                }

                function updateStatus(isActive, text) {
                    statusBar.style.display = 'flex';
                    statusDot.classList.toggle('active', isActive);
                    statusText.textContent = text;
                }

                function appendMessage(message, type = 'user', timestamp = Date.now(), metadata = {}) {
                    const messageDiv = document.createElement('div');
                    
                    if (type === 'thinking') {
                        messageDiv.className = 'thinking-message';
                        messageDiv.innerHTML = `
                            <div class="thinking-indicator">
                                <div class="thinking-dot"></div>
                                <div class="thinking-dot"></div>
                                <div class="thinking-dot"></div>
                            </div>
                            <span>${message}</span>
                            ${metadata.stage ? `<span class="stage-indicator">${metadata.stage}</span>` : ''}
                        `;
                    } else if (type === 'error') {
                        messageDiv.className = 'error-message';
                        messageDiv.textContent = message;
                    } else {
                        messageDiv.className = 'message ' + type + '-message';
                        
                        const header = document.createElement('div');
                        header.className = 'message-header';
                        
                        const avatar = document.createElement('div');
                        avatar.className = 'message-avatar';
                        avatar.textContent = type === 'user' ? 'U' : 'A';
                        
                        const info = document.createElement('div');
                        info.className = 'message-info';
                        
                        const author = document.createElement('div');
                        author.className = 'message-author';
                        author.textContent = type === 'user' ? 'Você' : 'Assistente';
                        
                        const time = document.createElement('span');
                        time.className = 'message-timestamp';
                        time.textContent = formatTimestamp(timestamp);
                        
                        info.appendChild(author);
                        info.appendChild(time);
                        
                        header.appendChild(avatar);
                        header.appendChild(info);
                        messageDiv.appendChild(header);

                        const content = document.createElement('div');
                        content.className = 'message-content';

                        if (type === 'assistant') {
                            const codeBlocks = message.match(/\`\`\`[\\s\\S]*?\`\`\`/g) || [];
                            let remainingText = message;

                            if (codeBlocks.length > 0) {
                                codeBlocks.forEach(block => {
                                    const parts = remainingText.split(block);
                                    if (parts[0]) {
                                        const textNode = document.createElement('p');
                                        textNode.textContent = parts[0].trim();
                                        content.appendChild(textNode);
                                    }

                                    const code = block.replace(/\`\`\`/g, '').trim();
                                    content.appendChild(createCodeBlock(code, metadata.codeLanguage));

                                    remainingText = parts[1];
                                });

                                if (remainingText) {
                                    const textNode = document.createElement('p');
                                    textNode.textContent = remainingText.trim();
                                    content.appendChild(textNode);
                                }
                            } else {
                                content.textContent = message;
                            }

                            if (metadata.suggestions) {
                                const suggestionsElement = createSuggestions(metadata.suggestions);
                                if (suggestionsElement) {
                                    content.appendChild(suggestionsElement);
                                }
                            }
                        } else {
                            content.textContent = message;
                        }

                        messageDiv.appendChild(content);
                    }

                    chatDiv.appendChild(messageDiv);
                    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }

                window.addEventListener('message', event => {
                    const message = event.data;

                    switch (message.type) {
                        case 'loading':
                            loading.style.display = message.show ? 'inline-block' : 'none';
                            sendBtn.disabled = message.show;
                            updateStatus(message.show, message.show ? 'Processando...' : 'Pronto');
                            break;

                        case 'thinking':
                            appendMessage(message.text, 'thinking', Date.now(), message.metadata);
                            updateStatus(true, message.metadata?.stage || 'Processando...');
                            break;

                        case 'response':
                            appendMessage(message.text, 'assistant', Date.now(), message.metadata);
                            updateStatus(false, 'Pronto');
                            break;

                        case 'error':
                            appendMessage(message.text, 'error', Date.now());
                            updateStatus(false, 'Erro');
                            break;

                        case 'system':
                            appendMessage(message.text, 'system', Date.now(), message.metadata);
                            break;

                        case 'notification':
                            // TODO: Implementar notificações toast
                            break;

                        case 'loadHistory':
                            chatDiv.innerHTML = '';
                            message.history.forEach(msg => {
                                appendMessage(msg.text, msg.type, msg.timestamp, msg.metadata);
                            });
                            break;

                        case 'clearHistory':
                            chatDiv.innerHTML = '';
                            break;

                        case 'setInput':
                            input.value = message.text;
                            input.focus();
                            break;
                    }
                });

                input.addEventListener('input', () => {
                    input.style.height = 'auto';
                    input.style.height = input.scrollHeight + 'px';
                });

                sendBtn.addEventListener('click', () => {
                    const text = input.value.trim();
                    if (text) {
                        vscode.postMessage({ command: 'generate', text });
                        input.value = '';
                        input.style.height = 'auto';
                    }
                });

                clearBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'clearHistory' });
                });

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendBtn.click();
                    }
                });
            </script>
        </body>
        </html>`;
    }
}