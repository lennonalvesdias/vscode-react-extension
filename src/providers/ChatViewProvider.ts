import * as vscode from 'vscode';
import * as path from 'path';
import { ChatInterface } from '../components/ChatInterface';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'psCopilot.chatView';

  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

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

    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'sendMessage':
            try {
              // TODO: Implementar integração com os agentes
              const response = await this._processMessage(message.text);
              webviewView.webview.postMessage({
                command: 'receiveMessage',
                text: response,
                sender: 'assistant'
              });
            } catch (error) {
              vscode.window.showErrorMessage('Erro ao processar mensagem: ' + error);
            }
            break;
        }
      },
      undefined,
      []
    );
  }

  private async _processMessage(text: string): Promise<string> {
    // TODO: Implementar integração com os agentes
    return 'Mensagem recebida: ' + text;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.css'));

    return `<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>PS Copilot Chat</title>
          <link rel="stylesheet" href="${styleUri}">
        </head>
        <body>
          <div id="root"></div>
          <script src="${scriptUri}"></script>
        </body>
      </html>`;
  }
}
