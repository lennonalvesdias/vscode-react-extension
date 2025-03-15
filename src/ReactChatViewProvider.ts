import * as vscode from 'vscode';
import { ReactCodeGenerator } from './utils/codeGenerator';
import { baseStyles, buttonStyles, inputStyles, messageStyles } from './design-system';
import { colors } from './design-system/tokens/colors';
import { spacing } from './design-system/tokens/spacing';
import * as path from 'path';
import * as fs from 'fs';
import { TemplateUtils } from './utils/templateUtils';

interface ChatStats {
    totalMessages: number;
    commandsExecuted: number;
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
    private _webview?: vscode.WebviewView;
    private codeGenerator: ReactCodeGenerator;
    private static readonly CHAT_HISTORY_KEY = 'reactChatHistory';
    private static readonly CHAT_STATS_KEY = 'reactChatStats';
    private currentFile?: string;
    private stats: ChatStats = {
        totalMessages: 0,
        commandsExecuted: 0,
        lastModified: []
    };
    private workspaceRoot: string;
    private messages: ChatMessage[] = [];

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _extensionUri: vscode.Uri
    ) {
        this.setupFileChangeListener();
        this.loadStats();
        this.workspaceRoot = _context.workspaceState.get<string>('workspaceRoot') || '';
        this.codeGenerator = new ReactCodeGenerator();
    }

    private async loadStats() {
        const savedStats = this._context.globalState.get<ChatStats>(ReactChatViewProvider.CHAT_STATS_KEY);
        if (savedStats) {
            this.stats = savedStats;
        }
    }

    private async updateStats(action: 'create' | 'modify', fileName: string) {
        if (action === 'create') {
            this.stats.totalMessages++;
            this.stats.commandsExecuted++;
            this.stats.lastModified = [fileName, ...this.stats.lastModified.slice(0, 4)];
            
            await this._context.globalState.update(ReactChatViewProvider.CHAT_STATS_KEY, this.stats);
            
            // Enviar atualização para o webview
            this.sendStatsUpdate();
        } else {
            this.stats.totalMessages++;
            this.stats.commandsExecuted++;
            this.stats.lastModified = [fileName, ...this.stats.lastModified.slice(0, 4)];
            
            await this._context.globalState.update(ReactChatViewProvider.CHAT_STATS_KEY, this.stats);
            
            // Enviar atualização para o webview
            this.sendStatsUpdate();
        }
    }

    private async sendStatsUpdate() {
        if (this._webview) {
            const statsMessage = this.formatStats();
            await this.saveMessage({
                type: 'stats',
                text: statsMessage,
                timestamp: Date.now(),
                metadata: { stats: this.stats }
            });
            
            this._webview.webview.postMessage({
                type: 'statsUpdate',
                stats: this.stats,
                formattedStats: statsMessage
            });
        }
    }

    private formatStats(): string {
        return `📊 Estatísticas do Projeto:
• Mensagens Recebidas: ${this.stats.totalMessages}
• Comandos Executados: ${this.stats.commandsExecuted}
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
            if (this._webview) {
                this._webview.webview.postMessage({ type: 'newMessage', message });
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
            
            if (this._webview) {
                this._webview.webview.postMessage({ type: 'clearHistory' });
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
        if (this._webview) {
            this._webview.webview.postMessage({ 
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
            // Atualizar UI para mostrar que está processando
            this._webview?.webview.postMessage({ type: 'loading', show: true });
            this._webview?.webview.postMessage({ type: 'thinking', text: 'Analisando sua solicitação...', metadata: { stage: 'analyzing' } });

            // Adicionar mensagem do usuário
            await this.saveMessage({ 
                type: 'user', 
                text: request,
                timestamp: Date.now()
            });

            // Processar a solicitação em etapas
            const stages: { stage: 'analyzing' | 'generating' | 'formatting'; text: string }[] = [
                { stage: 'analyzing', text: 'Analisando estrutura do projeto...' },
                { stage: 'generating', text: 'Gerando código...' },
                { stage: 'formatting', text: 'Formatando resposta...' }
            ];

            for (const { stage, text } of stages) {
                this._webview?.webview.postMessage({ type: 'thinking', text, metadata: { stage } });
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
            this._webview?.webview.postMessage({
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
            this._webview?.webview.postMessage({ type: 'error', text: `Erro ao processar sua solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
            await this.saveMessage({
                type: 'error',
                text: `Erro ao processar sua solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                timestamp: Date.now()
            });
        } finally {
            // Esconder indicador de loading
            this._webview?.webview.postMessage({ type: 'loading', show: false });
        }
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this._webview = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this.getHtmlForWebview();

        // Configurar manipulador de mensagens
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'input':
                    await this.handleInput(message.text);
                    break;
                case 'clearHistory':
                    await this.clearHistory();
                    break;
            }
        });
    }

    private getHtmlForWebview(): string {
        const html: string = `<!DOCTYPE html>
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
                    opacity: 0.8;
                    transition: opacity 0.2s, background-color 0.2s;
                }

                .action-button:hover {
                    opacity: 1;
                    background: var(--vscode-button-hoverBackground);
                }

                .action-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .action-button.primary {
                    background: var(--vscode-button-background);
                    opacity: 1;
                }

                .action-button.primary:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .action-button.danger {
                    color: var(--vscode-errorForeground);
                }

                .action-button.danger:hover {
                    background: var(--vscode-inputValidation-errorBackground);
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
                        <button class="action-button danger" id="clearBtn" title="Limpar histórico">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor"/>
                            </svg>
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
                    statusBar.style.display = 'flex';
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
                        const existingThinking = document.querySelector('.thinking-message');
                        if (existingThinking) {
                            existingThinking.remove();
                        }
                        messageDiv.className = 'thinking-message';
                        
                        const indicator = document.createElement('div');
                        indicator.className = 'thinking-indicator';
                        
                        for (let i = 0; i < 3; i++) {
                            const dot = document.createElement('div');
                            dot.className = 'thinking-dot';
                            indicator.appendChild(dot);
                        }
                        
                        const messageSpan = document.createElement('span');
                        messageSpan.textContent = message;
                        
                        messageDiv.appendChild(indicator);
                        messageDiv.appendChild(messageSpan);
                        
                        if (metadata.stage) {
                            const stageSpan = document.createElement('span');
                            stageSpan.className = 'stage-indicator';
                            stageSpan.textContent = metadata.stage;
                            messageDiv.appendChild(stageSpan);
                        }
                    } else if (type === 'error') {
                        messageDiv.className = 'error-message';
                        messageDiv.textContent = message;
                    } else {
                        messageDiv.className = 'message ' + type + '-message';
                        
                        const avatar = document.createElement('div');
                        avatar.className = 'message-avatar';
                        avatar.textContent = type === 'user' ? 'U' : type === 'assistant' ? 'A' : 'S';
                        
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

                        messageDiv.appendChild(avatar);
                        messageDiv.appendChild(content);
                    }

                    chatDiv.appendChild(messageDiv);
                    chatDiv.scrollTop = chatDiv.scrollHeight;
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
                            appendMessage('Histórico limpo com sucesso! 🧹', 'system', Date.now());
                            break;

                        case 'setInput':
                            input.value = message.text;
                            input.focus();
                            break;
                    }
                });

                clearBtn.addEventListener('click', () => {
                    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                        vscode.postMessage({ command: 'clearHistory' });
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

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendBtn.click();
                    }
                });
            </script>
        </body>
        </html>`;
        return html;
    }

    private updateWebview(): void {
        if (this._webview) {
            this._webview.webview.postMessage({ type: 'updateView', messages: this.messages });
        }
    }

    private async handleInput(input: string): Promise<void> {
        // Adicionar a mensagem do usuário ao histórico
        this.messages.push({
            type: 'user',
            text: input,
            timestamp: Date.now()
        });

        // Atualizar a visualização
        this.updateWebview();

        // Processar a mensagem
        await this.handleMessage(input);

        // Atualizar as estatísticas
        this.updateStats('create', input);
    }

    private async handleMessage(message: string): Promise<void> {
        try {
            // Adicionar mensagem de "pensando"
            this.messages.push({
                type: 'thinking',
                text: 'Processando...',
                timestamp: Date.now()
            });
            this.updateWebview();

            // Verificar se a mensagem é um comando
            if (message.toLowerCase().startsWith('criar') || message.toLowerCase().startsWith('crie')) {
                await this.handleCommand(message);
                return;
            }

            // Outras ações podem ser adicionadas aqui
            this.messages.push({
                type: 'error',
                text: 'Não entendi o que você quer fazer. Por favor, use comandos como "criar componente".',
                timestamp: Date.now()
            });
            this.updateWebview();
        } catch (err) {
            const error = err as Error;
            console.error('Erro ao processar mensagem:', error);
            this.messages.push({
                type: 'error',
                text: `Erro ao processar mensagem: ${error.message}`,
                timestamp: Date.now()
            });
            this.updateWebview();
        }
    }

    private async handleCommand(command: string): Promise<void> {
        const createComponentRegex = /^criar? (um )?componente/i;
        
        if (createComponentRegex.test(command)) {
            await this.handleCreateComponent(command);
            return;
        }

        // Outros comandos podem ser adicionados aqui
        this.messages.push({
            type: 'error',
            text: 'Comando não reconhecido',
            timestamp: Date.now()
        });
        this.updateWebview();
    }

    private async handleCreateComponent(request: string): Promise<void> {
        try {
            const isTypeScript = await this.isTypeScriptProject();
            const template = TemplateUtils.generateComponent(request, isTypeScript);
            const componentDir = path.join(this.workspaceRoot, 'src', 'components', template.name);
            
            await fs.promises.mkdir(componentDir, { recursive: true });

            const files = [
                {
                    path: path.join(componentDir, `${template.name}.${isTypeScript ? 'tsx' : 'jsx'}`),
                    content: template.component
                },
                {
                    path: path.join(componentDir, `${template.name}.module.css`),
                    content: template.styles
                }
            ];

            if (template.types && isTypeScript) {
                files.push({
                    path: path.join(componentDir, `${template.name}.types.ts`),
                    content: template.types
                });
            }

            await Promise.all(files.map(file => fs.promises.writeFile(file.path, file.content)));

            this.messages.push({
                type: 'system',
                text: `Componente ${template.name} criado com sucesso!`,
                timestamp: Date.now(),
                metadata: {
                    componentType: template.name,
                    action: 'create',
                    fileCreated: files.map(f => f.path).join(', ')
                }
            });
            this.updateWebview();
        } catch (err) {
            const error = err as Error;
            console.error('Erro ao criar componente:', error);
            this.messages.push({
                type: 'error',
                text: `Erro ao criar componente: ${error.message}`,
                timestamp: Date.now()
            });
            this.updateWebview();
        }
    }

    private async isTypeScriptProject(): Promise<boolean> {
        try {
            const tsConfigPath = path.join(this.workspaceRoot, 'tsconfig.json');
            await fs.promises.access(tsConfigPath);
            return true;
        } catch {
            return false;
        }
    }

    private showMessage(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    private showError(message: string): void {
        vscode.window.showErrorMessage(message);
    }

}