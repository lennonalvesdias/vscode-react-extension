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

                body {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                }

                .toolbar {
                    ${buttonStyles.base}
                    display: flex;
                    align-items: center;
                    padding: ${spacing.xs} ${spacing.sm};
                    border-bottom: 1px solid ${colors.border};
                    background: ${colors.backgroundLight};
                    height: 32px;
                }

                .toolbar-actions {
                    margin-left: auto;
                    display: flex;
                    gap: ${spacing.xs};
                }
                
                #chat { 
                    flex: 1;
                    overflow-y: auto;
                    padding: ${spacing.sm};
                    scroll-behavior: smooth;
                    position: relative;
                }

                #inputArea { 
                    ${inputStyles.base}
                    padding: ${spacing.xs} ${spacing.sm};
                    border-top: 1px solid ${colors.border};
                    background: ${colors.backgroundLight};
                    display: flex;
                    gap: ${spacing.xs};
                    align-items: flex-start;
                }

                #userInput {
                    ${inputStyles.base}
                    ${inputStyles.textarea}
                    flex: 1;
                    min-height: 38px;
                    max-height: 150px;
                    resize: none;
                    margin: 0;
                }

                .action-button {
                    ${buttonStyles.base}
                    height: 28px;
                    padding: 0 ${spacing.sm};
                    display: inline-flex;
                    align-items: center;
                    gap: ${spacing.xs};
                    font-size: 12px;
                    min-width: auto;
                }

                .action-button.icon {
                    width: 28px;
                    padding: 0;
                    justify-content: center;
                }

                .action-button.primary {
                    ${buttonStyles.primary}
                    height: 38px;
                }

                .action-button.warning {
                    ${buttonStyles.warning}
                }

                .action-button[disabled] {
                    ${buttonStyles.disabled}
                }

                .message {
                    ${messageStyles.base}
                    margin: ${spacing.xs} 0;
                    padding: ${spacing.sm};
                    border-radius: ${spacing.borderRadius};
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
                    font-size: 12px;
                    padding: ${spacing.xs} ${spacing.sm};
                }

                .message-timestamp {
                    ${messageStyles.timestamp}
                    font-size: 10px;
                }

                .stats-badge {
                    background: ${colors.badge};
                    color: ${colors.badgeText};
                    padding: 0 6px;
                    border-radius: 10px;
                    font-size: 10px;
                    min-width: 16px;
                    height: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .stats-panel {
                    background: ${colors.backgroundLight};
                    border: 1px solid ${colors.border};
                    border-radius: ${spacing.borderRadius};
                    padding: ${spacing.sm};
                    margin-bottom: ${spacing.sm};
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: ${spacing.xs};
                    margin-top: ${spacing.xs};
                }

                .stats-item {
                    background: ${colors.backgroundInactive};
                    padding: ${spacing.xs};
                    border-radius: ${spacing.borderRadius};
                    text-align: center;
                }

                .stats-value {
                    font-size: 18px;
                    font-weight: bold;
                    color: ${colors.primary};
                }

                .stats-label {
                    font-size: 11px;
                    color: ${colors.textSecondary};
                    margin-top: 2px;
                }

                .recent-files {
                    margin-top: ${spacing.sm};
                    padding-top: ${spacing.xs};
                    border-top: 1px solid ${colors.border};
                    font-size: 11px;
                }

                .recent-file {
                    display: flex;
                    align-items: center;
                    gap: ${spacing.xs};
                    padding: 2px 0;
                    color: ${colors.textSecondary};
                }

                .suggestions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: ${spacing.xs};
                    margin-top: ${spacing.xs};
                }

                .suggestion-chip {
                    ${buttonStyles.base}
                    ${buttonStyles.secondary}
                    padding: 2px ${spacing.xs};
                    font-size: 11px;
                    height: 20px;
                }

                .suggestion-chip:hover {
                    ${buttonStyles.primary}
                }

                .loading {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid currentColor;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to {transform: rotate(360deg);}
                }

                .code-block {
                    background: ${colors.background};
                    border: 1px solid ${colors.border};
                    border-radius: ${spacing.borderRadius};
                    margin: ${spacing.xs} 0;
                }

                .code-block-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: ${spacing.xs} ${spacing.sm};
                    border-bottom: 1px solid ${colors.border};
                    font-size: 11px;
                    color: ${colors.textSecondary};
                }

                .code-block pre {
                    margin: 0;
                    padding: ${spacing.sm};
                    overflow-x: auto;
                }

                .copy-button {
                    ${buttonStyles.base}
                    ${buttonStyles.secondary}
                    height: 20px;
                    padding: 0 ${spacing.xs};
                    font-size: 11px;
                }

                .notification {
                    position: fixed;
                    bottom: ${spacing.sm};
                    right: ${spacing.sm};
                    background: ${colors.notification};
                    color: ${colors.notificationText};
                    padding: ${spacing.xs} ${spacing.sm};
                    border-radius: ${spacing.borderRadius};
                    font-size: 12px;
                    animation: fadeInOut 2s ease-in-out forwards;
                    z-index: 1000;
                }

                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(10px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            </style>
        </head>
        <body>
            <div class="toolbar">
                <button class="action-button icon" id="statsBtn" title="Ver estatísticas">
                    📊 <span class="stats-badge" id="statsCount">0</span>
                </button>
                <div class="toolbar-actions">
                    <button class="action-button icon" id="undoBtn" title="Desfazer última alteração" disabled>
                        ↩️
                    </button>
                    <button class="action-button icon warning" id="clearBtn" title="Limpar histórico">
                        🗑️
                    </button>
                </div>
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
                    <span>Gerar</span>
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