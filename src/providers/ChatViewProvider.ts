import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'psCopilot.chatView';

  private _view?: vscode.WebviewView;
  private _messages: Array<{ text: string; sender: string }> = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

  public resolveWebviewView(
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
    webviewView.description = "Chat com agentes especializados";

    // Renderize o HTML da view
    this._updateWebview();

    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'sendMessage':
            try {
              // Adiciona a mensagem do usuário
              this._messages.push({
                text: message.text,
                sender: 'user'
              });

              // Processa a mensagem
              const response = await this._processMessage(message.text);

              // Adiciona a resposta do assistente
              this._messages.push({
                text: response,
                sender: 'assistant'
              });

              // Atualiza o HTML do webview
              this._updateWebview();
            } catch (error) {
              vscode.window.showErrorMessage('Erro ao processar mensagem: ' + error);
            }
            break;
        }
      }
    );
  }

  private async _processMessage(text: string): Promise<string> {
    // Mensagem simples para testes
    return `Mensagem recebida: "${text}". Esta é uma resposta de teste.`;
  }

  private _updateWebview() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview();
    }
  }

  private _getHtmlForWebview() {
    // Estilos CSS para o chat
    const styleContent = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .chat-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        max-width: 100%;
        margin: 0 auto;
      }
      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
      }
      .message {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 80%;
        word-wrap: break-word;
      }
      .user-message {
        background-color: #007acc;
        color: white;
        align-self: flex-end;
      }
      .assistant-message {
        background-color: #f1f1f1;
        color: #333;
        align-self: flex-start;
      }
      .input-container {
        display: flex;
        padding: 10px;
        border-top: 1px solid #ddd;
        background-color: #f9f9f9;
      }
      .input-container input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-right: 8px;
      }
      .input-container button {
        padding: 8px 16px;
        background-color: #007acc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .input-container button:hover {
        background-color: #005999;
      }
      .input-container button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
    `;

    // Renderiza as mensagens
    let messagesHtml = '';
    for (const message of this._messages) {
      const messageClass = message.sender === 'user' ? 'user-message' : 'assistant-message';
      messagesHtml += `
        <div class="message ${messageClass}">
          <div class="message-content">${this._escapeHtml(message.text)}</div>
        </div>
      `;
    }

    // Script JavaScript para interação do chat
    const scriptContent = `
      const vscode = acquireVsCodeApi();
      const messageInput = document.getElementById('messageInput');
      const sendButton = document.getElementById('sendButton');
      const messagesContainer = document.getElementById('messages');

      // Rolar para o final da conversa
      function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Rolar para o final inicialmente
      scrollToBottom();

      // Dar foco ao input
      messageInput.focus();

      // Handler para botão enviar
      sendButton.addEventListener('click', () => {
        const text = messageInput.value.trim();

        if (text) {
          vscode.postMessage({
            command: 'sendMessage',
            text: text
          });

          // Limpar o input após enviar
          messageInput.value = '';

          // Focar no input novamente
          messageInput.focus();
        }
      });

      // Handler para tecla Enter
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendButton.click();
        }
      });
    `;

    return `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
          <title>PS Copilot Chat</title>
          <style>${styleContent}</style>
        </head>
        <body>
          <div class="chat-container">
            <div class="messages-container" id="messages">
              ${messagesHtml}
            </div>
            <div class="input-container">
              <input type="text" id="messageInput" placeholder="Digite sua mensagem...">
              <button id="sendButton">Enviar</button>
            </div>
          </div>
          <script>${scriptContent}</script>
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
