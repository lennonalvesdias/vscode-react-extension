import * as vscode from 'vscode';

export const EXTENSION_NAME = 'Arsenal-Soma Code Generator';
export const VIEW_TYPE = 'arsenalSomaChat';
export const VIEW_CONTAINER_ID = 'arsenal-soma';

// Configurações da OpenAI
export const OPENAI_CONFIG = {
    MODEL: 'gpt-4o',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 2000
};

export interface ChatMessage {
    message: string;
    sender: 'user' | 'system';
}

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
        enableScripts: true,
        localResourceRoots: [extensionUri]
    };
}

export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export async function getOpenAIKey(): Promise<string> {
    const config = vscode.workspace.getConfiguration('arsenalSoma');
    let apiKey = config.get<string>('openaiApiKey');
    
    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
            prompt: 'Digite sua API Key da OpenAI',
            password: true,
            ignoreFocusOut: true
        });
        
        if (apiKey) {
            await config.update('openaiApiKey', apiKey, true);
        } else {
            throw new Error('API Key da OpenAI é necessária para gerar componentes.');
        }
    }
    
    return apiKey;
} 