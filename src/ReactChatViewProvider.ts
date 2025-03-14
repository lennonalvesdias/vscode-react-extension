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
    type: 'user' | 'assistant' | 'error' | 'code' | 'system' | 'suggestion' | 'stats';
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

    private async saveMessage(message: ChatMessage) {
        const history = await this.getChatHistory();
        history.push({ 
            ...message, 
            timestamp: Date.now(),
            metadata: {
                ...message.metadata,
                currentFile: this.currentFile
            }
        });
        await this._context.globalState.update(ReactChatViewProvider.CHAT_HISTORY_KEY, history);
    }

    private async getChatHistory(): Promise<ChatMessage[]> {
        return this._context.globalState.get<ChatMessage[]>(ReactChatViewProvider.CHAT_HISTORY_KEY, []);
    }

    private async clearChatHistory() {
        await this._context.globalState.update(ReactChatViewProvider.CHAT_HISTORY_KEY, []);
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearChat' });
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

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // Definir largura inicial adequada
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Carregar histórico após inicializar o webview
        this.getChatHistory().then(history => {
            if (history.length > 0) {
                webviewView.webview.postMessage({ type: 'loadHistory', history });
            } else {
                this.addSystemMessage('👋 Bem-vindo ao React Chat! Aqui estão alguns exemplos do que você pode fazer:', [
                    'Crie um componente de tabela de usuários com paginação e busca',
                    'Edite o componente UserList para adicionar ordenação por coluna',
                    'Crie um serviço de autenticação com JWT',
                    'Adicione integração com a API REST https://api.exemplo.com/users',
                    'Crie um formulário de cadastro com validação Yup'
                ]);
            }
        });

        webviewView.webview.onDidReceiveMessage(async (message) => {
            try {
                if (message.command === 'generate') {
                    // Salvar mensagem do usuário
                    await this.saveMessage({ 
                        type: 'user', 
                        text: message.text,
                        timestamp: Date.now()
                    });
                    
                    // Mostrar indicador de loading
                    webviewView.webview.postMessage({ type: 'loading', show: true });
                    
                    const result = await this.codeGenerator.generateComponent(message.text);
                    
                    // Detectar linguagem do código
                    const codeLanguage = result.toLowerCase().includes('typescript') ? 'typescript' : 'javascript';
                    
                    // Salvar resposta do assistente
                    await this.saveMessage({ 
                        type: 'assistant',
                        text: result,
                        timestamp: Date.now(),
                        metadata: {
                            action: 'generate',
                            componentType: 'react',
                            codeLanguage,
                            suggestions: this.getSuggestionsForContext()
                        }
                    });
                    
                    webviewView.webview.postMessage({ 
                        type: 'response',
                        text: result,
                        metadata: {
                            action: 'generate',
                            componentType: 'react',
                            codeLanguage,
                            suggestions: this.getSuggestionsForContext()
                        }
                    });

                    // Esconder indicador de loading
                    webviewView.webview.postMessage({ type: 'loading', show: false });
                    
                } else if (message.command === 'clearHistory') {
                    await this.clearChatHistory();
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
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                
                // Salvar mensagem de erro
                await this.saveMessage({ 
                    type: 'error',
                    text: errorMessage,
                    timestamp: Date.now()
                });
                
                webviewView.webview.postMessage({ type: 'error', text: errorMessage });
                webviewView.webview.postMessage({ type: 'loading', show: false });
                vscode.window.showErrorMessage(errorMessage);
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
                ${baseStyles}

                .toolbar {
                    ${buttonStyles.base}
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: ${spacing.sm};
                    border-bottom: 1px solid ${colors.border};
                }

                .toolbar-group {
                    display: flex;
                    gap: ${spacing.sm};
                }

                .stats-badge {
                    background: ${colors.badge};
                    color: ${colors.badgeText};
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 11px;
                    margin-left: 4px;
                }
                
                #chat { 
                    flex: 1;
                    overflow-y: auto;
                    padding: 5px 10px;
                    margin: 0;
                    height: calc(100vh - 140px);
                    scroll-behavior: smooth;
                }

                #inputArea { 
                    ${inputStyles.base}
                    position: relative;
                    padding: ${spacing.sm};
                    border-top: 1px solid ${colors.border};
                }

                #userInput {
                    ${inputStyles.base}
                    ${inputStyles.textarea}
                    padding-right: 80px; /* Espaço para o contador */
                }

                .char-counter {
                    position: absolute;
                    right: 100px;
                    bottom: 20px;
                    font-size: 11px;
                    color: ${colors.textLight};
                }

                .scroll-top {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    background: ${colors.backgroundLight};
                    border: 1px solid ${colors.border};
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.3s;
                    z-index: 1000;
                }

                .scroll-top.visible {
                    opacity: 0.8;
                }

                .scroll-top:hover {
                    opacity: 1;
                }

                .stats-panel {
                    background: ${colors.backgroundLight};
                    border: 1px solid ${colors.border};
                    border-radius: ${spacing.borderRadius};
                    padding: ${spacing.md};
                    margin: ${spacing.sm};
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: ${spacing.sm};
                    margin-top: ${spacing.sm};
                }

                .stats-item {
                    background: ${colors.backgroundInactive};
                    padding: ${spacing.sm};
                    border-radius: ${spacing.borderRadius};
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .stats-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: ${colors.primary};
                }

                .stats-label {
                    font-size: 12px;
                    color: ${colors.textLight};
                    margin-top: 4px;
                }

                .recent-files {
                    margin-top: ${spacing.md};
                    padding-top: ${spacing.sm};
                    border-top: 1px solid ${colors.border};
                }

                .recent-file {
                    display: flex;
                    align-items: center;
                    gap: ${spacing.xs};
                    padding: ${spacing.xs} 0;
                    font-size: 12px;
                    color: ${colors.textLight};
                }

                .action-button {
                    ${buttonStyles.base}
                }
                
                .action-button.primary {
                    ${buttonStyles.primary}
                }

                .action-button.warning {
                    ${buttonStyles.warning}
                }

                .action-button[disabled] {
                    ${buttonStyles.disabled}
                }

                .message {
                    ${messageStyles.base}
                }

                .user-message {
                    ${messageStyles.user}
                }

                .assistant-message {
                    ${messageStyles.assistant}
                }

                .error-message {
                    ${messageStyles.error}
                }

                .system-message {
                    ${messageStyles.system}
                }

                .message-timestamp {
                    ${messageStyles.timestamp}
                }

                .notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    ${messageStyles.error}
                    animation: fadeInOut 2s ease-in-out forwards;
                }

                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(20px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }

                .suggestions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 8px;
                }

                .suggestion-chip {
                    ${buttonStyles.base}
                    ${buttonStyles.secondary}
                    padding: 4px 8px;
                    font-size: 11px;
                }

                .suggestion-chip:hover {
                    ${buttonStyles.primary}
                }

                .loading {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid currentColor;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                    margin-right: 8px;
                }

                @keyframes spin {
                    to {transform: rotate(360deg);}
                }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <div class="toolbar-group">
                    <button class="action-button" id="statsBtn" title="Ver estatísticas">
                        📊 Stats
                <button class="action-button" id="statsBtn" title="Ver estatísticas">
                    📊 Stats
                    <span class="stats-badge" id="statsCount">0</span>
                </button>
                <div class="divider"></div>
                <button class="action-button" id="undoBtn" title="Desfazer última alteração" disabled>
                    ↩️ Desfazer
                </button>
                <button class="action-button warning" id="clearBtn" title="Limpar histórico">
                    🗑️ Limpar
                </button>
            </div>
            
            <div id="chat">
                <div class="placeholder">Carregando...</div>
            </div>
            
            <div id="inputArea">
                <textarea id="userInput" 
                    placeholder="Digite seu comando... (Ex: Crie um componente de tabela de usuários com paginação)"
                    rows="1"></textarea>
                <button class="action-button primary" id="sendBtn">
                    <span class="loading" style="display: none;"></span>
                    <span>Gerar Código</span>
                </button>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                const chatDiv = document.getElementById('chat');
                const input = document.getElementById('userInput');
                const sendBtn = document.getElementById('sendBtn');
                const clearBtn = document.getElementById('clearBtn');
                const loading = sendBtn.querySelector('.loading');
                const statsBtn = document.getElementById('statsBtn');
                const undoBtn = document.getElementById('undoBtn');
                const statsCount = document.getElementById('statsCount');

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

                function appendMessage(message, type = 'user', timestamp = Date.now(), metadata = {}) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + type + '-message';
                    
                    // Verificar se o usuário está próximo do final antes de adicionar a mensagem
                    const shouldScroll = chatDiv.scrollTop + chatDiv.clientHeight >= chatDiv.scrollHeight - 100;
                    
                    // Adicionar contexto do arquivo se disponível
                    if (metadata.currentFile) {
                        const fileContext = document.createElement('div');
                        fileContext.className = 'file-context';
                        fileContext.textContent = '📁 ' + metadata.currentFile.split('/').pop();
                        messageDiv.appendChild(fileContext);
                    }
                    
                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'message-timestamp';
                    timeSpan.textContent = formatTimestamp(timestamp);
                    messageDiv.appendChild(timeSpan);

                    if (type === 'assistant') {
                        // Procurar por blocos de código
                        const codeBlocks = message.match(/\`\`\`[\\s\\S]*?\`\`\`/g) || [];
                        let remainingText = message;

                        if (codeBlocks.length > 0) {
                            codeBlocks.forEach(block => {
                                const parts = remainingText.split(block);
                                if (parts[0]) {
                                    const textNode = document.createElement('p');
                                    textNode.textContent = parts[0].trim();
                                    messageDiv.appendChild(textNode);
                                }

                                const code = block.replace(/\`\`\`/g, '').trim();
                                messageDiv.appendChild(createCodeBlock(code, metadata.codeLanguage));

                                remainingText = parts[1];
                            });

                            if (remainingText) {
                                const textNode = document.createElement('p');
                                textNode.textContent = remainingText.trim();
                                messageDiv.appendChild(textNode);
                            }
                        } else {
                            messageDiv.textContent = message;
                        }

                        // Adicionar sugestões se disponíveis
                        if (metadata.suggestions) {
                            const suggestionsElement = createSuggestions(metadata.suggestions);
                            if (suggestionsElement) {
                                messageDiv.appendChild(suggestionsElement);
                            }
                        }
                    } else {
                        messageDiv.textContent = message;
                    }

                    chatDiv.appendChild(messageDiv);
                    
                    // Só rolar para o final se o usuário estiver próximo do final
                    if (shouldScroll) {
                        setTimeout(() => {
                            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }, 100);
                    }
                }

                function showNotification(text) {
                    const notification = document.createElement('div');
                    notification.className = 'notification';
                    notification.textContent = text;
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.remove();
                    }, 2000);
                }

                function adjustTextareaHeight() {
                    input.style.height = 'auto';
                    input.style.height = (input.scrollHeight) + 'px';
                }

                input.addEventListener('input', adjustTextareaHeight);

                sendBtn.addEventListener('click', () => {
                    const userMessage = input.value.trim();
                    if (userMessage) {
                        appendMessage(userMessage, 'user');
                        vscode.postMessage({ 
                            command: 'generate',
                            text: userMessage
                        });
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

                statsBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'showStats' });
                });
                
                undoBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'undo' });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    if (message.type === 'loading') {
                        loading.style.display = message.show ? 'inline-block' : 'none';
                        sendBtn.disabled = message.show;
                    } else if (message.type === 'response') {
                        appendMessage(message.text, 'assistant', Date.now(), message.metadata);
                    } else if (message.type === 'error') {
                        appendMessage(message.text, 'error', Date.now());
                    } else if (message.type === 'system') {
                        appendMessage(message.text, 'system', Date.now(), message.metadata);
                    } else if (message.type === 'notification') {
                        showNotification(message.text);
                    } else if (message.type === 'loadHistory') {
                        chatDiv.innerHTML = '';
                        message.history.forEach(msg => {
                            appendMessage(msg.text, msg.type, msg.timestamp, msg.metadata);
                        });
                        // Garantir que após carregar o histórico, role para o final
                        setTimeout(() => {
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        }, 100);
                    } else if (message.type === 'clearChat') {
                        chatDiv.innerHTML = '';
                        input.value = '';
                        input.style.height = 'auto';
                    } else if (message.type === 'setInput') {
                        input.value = message.text;
                        input.focus();
                        adjustTextareaHeight();
                    } else if (message.type === 'statsUpdate') {
                        const total = message.stats.filesCreated + message.stats.filesModified;
                        statsCount.textContent = total;
                        
                        if (message.text) {
                            appendMessage(message.text, 'stats');
                        }
                    } else if (message.type === 'undoAvailable') {
                        undoBtn.disabled = !message.available;
                    }
                });

                // Foco inicial no input
                input.focus();
            </script>
        </body>
        </html>`;
    }
} 