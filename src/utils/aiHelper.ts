import * as vscode from 'vscode';
import fetch from 'node-fetch';

interface AIResponse {
    action: 'create' | 'edit' | 'delete';
    componentType: 'table' | 'form' | 'page' | 'component';
    oldName?: string;
    newName: string;
    features: {
        type: string;
        fields?: { name: string; type: string; }[];
    }[];
}

interface OpenAIResponse {
    error?: { message: string };
    choices: Array<{
        message: {
            function_call: {
                arguments: string;
            };
        };
    }>;
}

export class AIHelper {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
    }

    public async parseRequest(request: string): Promise<AIResponse> {
        if (!this.apiKey) {
            const key = await this.promptForApiKey();
            if (!key) {
                throw new Error('API Key não fornecida');
            }
            this.apiKey = key;
            // Salvar a key para uso futuro
            process.env.OPENAI_API_KEY = key;
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Você é um assistente especializado em interpretar comandos para gerar código React. Analise a solicitação e retorne um JSON com a estrutura adequada."
                        },
                        {
                            role: "user",
                            content: `Interprete o seguinte comando e retorne um JSON com a ação necessária: "${request}"`
                        }
                    ],
                    functions: [
                        {
                            name: "process_request",
                            description: "Processa a solicitação do usuário para gerar ou modificar código",
                            parameters: {
                                type: "object",
                                properties: {
                                    action: {
                                        type: "string",
                                        enum: ["create", "edit", "delete"],
                                        description: "Ação a ser executada"
                                    },
                                    componentType: {
                                        type: "string",
                                        enum: ["table", "form", "page", "component"],
                                        description: "Tipo do componente"
                                    },
                                    oldName: {
                                        type: "string",
                                        description: "Nome atual do componente (em caso de edição)"
                                    },
                                    newName: {
                                        type: "string",
                                        description: "Novo nome do componente"
                                    },
                                    features: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                type: {
                                                    type: "string",
                                                    description: "Tipo da feature (table, form, etc)"
                                                },
                                                fields: {
                                                    type: "array",
                                                    items: {
                                                        type: "object",
                                                        properties: {
                                                            name: {
                                                                type: "string",
                                                                description: "Nome do campo"
                                                            },
                                                            type: {
                                                                type: "string",
                                                                description: "Tipo do campo"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                required: ["action", "componentType", "newName", "features"]
                            }
                        }
                    ],
                    function_call: { name: "process_request" }
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Erro na API: ${response.status} - ${errorData}`);
            }

            const data = await response.json() as OpenAIResponse;
            if (data.error) {
                throw new Error(data.error.message);
            }

            if (!data.choices?.[0]?.message?.function_call?.arguments) {
                throw new Error('Resposta inválida da API');
            }

            const functionCall = data.choices[0].message.function_call;
            return JSON.parse(functionCall.arguments);
        } catch (error) {
            console.error('Erro ao processar solicitação:', error);
            if (error instanceof Error) {
                throw new Error(`Erro ao interpretar a solicitação: ${error.message}`);
            }
            throw new Error('Erro ao interpretar a solicitação');
        }
    }

    private async promptForApiKey(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: 'Digite sua OpenAI API Key',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'sk-...'
        });
    }
} 