import * as vscode from 'vscode';

export function getWebviewContent(
    webview: vscode.Webview,
    scriptUri: vscode.Uri,
    styleUri: vscode.Uri,
    nonce: string
): string {
    return `<!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <link href="${styleUri}" rel="stylesheet">
            <title>Arsenal-Soma Chat</title>
        </head>
        <body>
            <div class="chat-container">
                <div id="messages" class="messages"></div>
                <div class="input-container">
                    <input type="text" id="messageInput" placeholder="Digite sua mensagem...">
                    <button id="sendButton">Enviar</button>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
}
