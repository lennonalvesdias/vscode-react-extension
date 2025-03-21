import * as vscode from 'vscode';
import { VIEW_TYPE, getWebviewOptions, getNonce, getOpenAIKey } from '../configuration';
import { getWebviewContent } from './chatViewContent';
import { OpenAIService } from '../services/openAIService';
import { ComponentGenerator } from '../services/componentGenerator';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private componentGenerator?: ComponentGenerator;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = getWebviewOptions(this._extensionUri);
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleUserMessage(data.message);
                    break;
            }
        });
    }

    private async _handleUserMessage(message: string) {
        if (!this._view) return;

        // Adiciona a mensagem do usuário ao chat
        this._view.webview.postMessage({ 
            type: 'addMessage', 
            message: message, 
            sender: 'user' 
        });

        try {
            // Verifica se há um workspace aberto
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('Por favor, abra uma pasta ou workspace antes de gerar componentes.');
            }

            // Verifica se é uma solicitação de geração de componente
            if (message.toLowerCase().includes('gere') || 
                message.toLowerCase().includes('crie') ||
                message.toLowerCase().includes('implemente')) {
                
                // Inicializa o gerador de componentes com a API key
                if (!this.componentGenerator) {
                    const apiKey = await getOpenAIKey();
                    if (!apiKey) {
                        throw new Error('API Key da OpenAI não configurada.');
                    }

                    const openAIService = new OpenAIService(apiKey);
                    try {
                        this.componentGenerator = new ComponentGenerator({
                            workspaceRoot: workspaceFolder.uri.fsPath,
                            openAIService
                        });
                    } catch (error) {
                        throw new Error(`Erro ao inicializar gerador de componentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                    }
                }

                // Função para enviar mensagens de progresso para o chat
                const onProgress = (progressMessage: string) => {
                    if (this._view) {
                        this._view.webview.postMessage({
                            type: 'addMessage',
                            message: progressMessage,
                            sender: 'system'
                        });
                    }
                };

                try {
                    // Gera o componente
                    await this.componentGenerator.generateComponent({
                        request: message,
                        showSuccessMessage: true,
                        onProgress
                    });

                    // Atualiza a visualização do explorador de arquivos
                    vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
                } catch (error) {
                    throw new Error(`Erro ao gerar componente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                }
            } else {
                // Resposta padrão para outras mensagens
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: `Para gerar um componente, comece sua mensagem com "gere", "crie" ou "implemente". Por exemplo: "gere um componente de lista de tarefas"`,
                    sender: 'system'
                });
            }
        } catch (error) {
            console.error('Erro no ChatViewProvider:', error);
            
            // Exibe mensagem de erro no chat
            this._view.webview.postMessage({
                type: 'addMessage',
                message: `Erro ao processar solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                sender: 'system'
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css')
        );

        return getWebviewContent(webview, scriptUri, styleUri, getNonce());
    }
} 