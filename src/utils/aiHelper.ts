import * as vscode from 'vscode';
import OpenAI from 'openai';

interface AIResponse {
    action: 'create' | 'edit' | 'delete';
    componentType: string;
    newName: string;
    oldName?: string;
    features: Array<{
        type: string;
        fields?: Array<{ name: string; type: string; validation?: string[] }>;
        service?: {
            baseURL: string;
            endpoints: Array<{ method: string; path: string }>;
            auth: boolean;
        };
    }>;
}

export class AIHelper {
    private openai!: OpenAI;
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (this.apiKey) {
            this.openai = new OpenAI({
                apiKey: this.apiKey
            });
        }
    }

    public async parseRequest(request: string): Promise<AIResponse> {
        if (!this.apiKey) {
            const input = await vscode.window.showInputBox({
                prompt: 'Por favor, insira sua chave da API OpenAI',
                password: true
            });

            if (!input) {
                throw new Error('Chave da API é necessária');
            }

            this.apiKey = input;
            this.openai = new OpenAI({
                apiKey: this.apiKey
            });
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente especializado em interpretar comandos para gerar componentes React.
                        
Analise o comando do usuário e retorne um objeto JSON com a seguinte estrutura:

{
    "action": "create" | "edit" | "delete",
    "componentType": "page" | "component" | "service" | "route" | "layout",
    "newName": string (PascalCase),
    "oldName"?: string (apenas para edit/delete),
    "features": Feature[]
}

Onde Feature pode ser:
{
    "type": "form" | "table" | "auth" | "pagination" | "filters" | "search" | "sorting",
    "fields"?: { name: string, type: string, validation?: string[] }[],
    "service"?: {
        "baseURL": string,
        "endpoints": { method: string, path: string }[],
        "auth": boolean
    }
}

Exemplos de interpretação:
1. "Criar página de login" =>
{
    "action": "create",
    "componentType": "page",
    "newName": "LoginPage",
    "features": [
        {
            "type": "form",
            "fields": [
                { "name": "email", "type": "string", "validation": ["required", "email"] },
                { "name": "password", "type": "string", "validation": ["required", "minLength:8"] }
            ]
        },
        {
            "type": "auth",
            "service": {
                "baseURL": "/api",
                "endpoints": [{ "method": "POST", "path": "/auth/login" }],
                "auth": true
            }
        }
    ]
}

2. "Criar tabela de usuários com paginação" =>
{
    "action": "create",
    "componentType": "component",
    "newName": "UserTable",
    "features": [
        {
            "type": "table",
            "fields": [
                { "name": "id", "type": "number" },
                { "name": "name", "type": "string" },
                { "name": "email", "type": "string" },
                { "name": "role", "type": "string" }
            ]
        },
        { "type": "pagination" }
    ]
}`
                    },
                    {
                        role: 'user',
                        content: request
                    }
                ]
            });

            const result = response.choices[0]?.message?.content;
            if (!result) {
                throw new Error('Resposta vazia da API');
            }

            try {
                return JSON.parse(result);
            } catch (error) {
                console.error('Erro ao fazer parse da resposta:', error);
                throw new Error('Falha ao interpretar resposta da API');
            }
        } catch (error) {
            console.error('Erro ao chamar API:', error);
            throw new Error('Falha ao processar requisição');
        }
    }
} 