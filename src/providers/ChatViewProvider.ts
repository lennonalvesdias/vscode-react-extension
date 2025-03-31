import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'psCopilot.chatView';

  constructor(
    private readonly _extensionUri: vscode.Uri,
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
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

  public async provideViewData(): Promise<any> {
    return {
      messages: [],
      agents: [],
      settings: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
      }
    };
  }

  private async _processMessage(text: string): Promise<string> {
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-eval' 'unsafe-inline';">
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
