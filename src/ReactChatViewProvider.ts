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
                ${baseStyles}

                body {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }

                #chat { 
                    flex: 1;
                    overflow-y: auto;
                    padding: ${spacing.sm};
                    scroll-behavior: smooth;
                    position: relative;
                    background: ${colors.background};
                }

                #inputArea { 
                    ${inputStyles.base}
                    padding: ${spacing.xs} ${spacing.sm};
                    border-top: 1px solid ${colors.border};
                    background: ${colors.backgroundLight};
                    display: flex;
                    flex-direction: column;
                    gap: ${spacing.xs};
                }

                #userInput {
                    ${inputStyles.base}
                    ${inputStyles.textarea}
                    width: 100%;
                    min-height: 60px;
                    max-height: 200px;
                    resize: none;
                    margin: 0;
                    padding: ${spacing.sm};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    background: ${colors.background};
                    font-size: 14px;
                    line-height: 1.5;
                }

                #userInput:focus {
                    outline: none;
                    border-color: ${colors.primary};
                    box-shadow: 0 0 0 2px ${colors.primaryAlpha};
                }

                .input-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 ${spacing.xs};
                }

                .input-actions {
                    display: flex;
                    gap: ${spacing.xs};
                }

                .input-hint {
                    font-size: 12px;
                    color: ${colors.textSecondary};
                }

                .message {
                    ${messageStyles.base}
                    margin: ${spacing.md} 0;
                    padding: ${spacing.md};
                    border-radius: 8px;
                    border: 1px solid ${colors.border};
                }

                .user-message {
                    ${messageStyles.user}
                    background: ${colors.backgroundLight};
                }

                .assistant-message {
                    ${messageStyles.assistant}
                }

                .error-message {
                    ${messageStyles.error}
                }

                .system-message {
                    ${messageStyles.system}
                    font-size: 13px;
                    padding: ${spacing.sm};
                    background: ${colors.backgroundInactive};
                    border: none;
                }

                .message-header {
                    display: flex;
                    align-items: center;
                    gap: ${spacing.sm};
                    margin-bottom: ${spacing.sm};
                }

                .message-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: ${colors.primary};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                }

                .message-info {
                    flex: 1;
                }

                .message-author {
                    font-weight: 600;
                    font-size: 14px;
                    color: ${colors.text};
                }

                .message-timestamp {
                    ${messageStyles.timestamp}
                    font-size: 12px;
                    color: ${colors.textSecondary};
                }

                .code-block {
                    background: ${colors.backgroundDark};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    margin: ${spacing.sm} 0;
                    overflow: hidden;
                }

                .code-block-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: ${spacing.sm};
                    background: ${colors.backgroundLight};
                    border-bottom: 1px solid ${colors.border};
                }

                .code-block pre {
                    margin: 0;
                    padding: ${spacing.md};
                    overflow-x: auto;
                    font-family: 'Fira Code', monospace;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .copy-button {
                    ${buttonStyles.base}
                    ${buttonStyles.secondary}
                    height: 24px;
                    padding: 0 ${spacing.sm};
                    font-size: 12px;
                    border-radius: 4px;
                }

                .copy-button:hover {
                    background: ${colors.backgroundHover};
                }

                .action-button {
                    ${buttonStyles.base}
                    height: 32px;
                    padding: 0 ${spacing.md};
                    font-size: 13px;
                    border-radius: 6px;
                    display: inline-flex;
                    align-items: center;
                    gap: ${spacing.xs};
                }

                .action-button.primary {
                    ${buttonStyles.primary}
                    background: ${colors.primary};
                    color: white;
                }

                .action-button.primary:hover {
                    background: ${colors.primaryDark};
                }

                .action-button[disabled] {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .suggestions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: ${spacing.xs};
                    margin-top: ${spacing.sm};
                }

                .suggestion-chip {
                    ${buttonStyles.base}
                    ${buttonStyles.secondary}
                    padding: ${spacing.xs} ${spacing.sm};
                    font-size: 12px;
                    border-radius: 12px;
                    background: ${colors.backgroundLight};
                    border: 1px solid ${colors.border};
                    color: ${colors.textSecondary};
                }

                .suggestion-chip:hover {
                    background: ${colors.backgroundHover};
                    color: ${colors.primary};
                    border-color: ${colors.primary};
                }

                .loading {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border: 2px solid ${colors.primary};
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to {transform: rotate(360deg);}
                }

                .notification {
                    position: fixed;
                    bottom: ${spacing.md};
                    right: ${spacing.md};
                    background: ${colors.notification};
                    color: ${colors.notificationText};
                    padding: ${spacing.sm} ${spacing.md};
                    border-radius: 6px;
                    font-size: 13px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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
            <div id="chat">
                <div class="placeholder">Carregando...</div>
            </div>
            
            <div id="inputArea">
                <textarea id="userInput" 
                    placeholder="Pergunte algo sobre React ou peça para gerar código..."
                    rows="1"></textarea>
                <div class="input-footer">
                    <div class="input-hint">
                        Pressione Enter para enviar, Shift+Enter para nova linha
                    </div>
                    <div class="input-actions">
                        <button class="action-button" id="clearBtn" title="Limpar histórico">
                            Limpar
                        </button>
                        <button class="action-button primary" id="sendBtn">
                            <span class="loading" style="display: none;"></span>
                            <span>Enviar</span>
                        </button>
                    </div>
                </div>
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

                function appendMessage(message, type = 'user', timestamp = Date.now(), metadata = {}) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + type + '-message';
                    
                    const shouldScroll = chatDiv.scrollTop + chatDiv.clientHeight >= chatDiv.scrollHeight - 100;
                    
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
                    chatDiv.appendChild(messageDiv);
                    
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