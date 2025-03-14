import * as vscode from 'vscode';
import fetch from 'node-fetch';

interface AIResponse {
    action: 'create' | 'edit' | 'delete' | 'import' | 'usage';
    componentType: 'table' | 'form' | 'page' | 'component';
    oldName?: string;
    newName: string;
    features: {
        type: string;
        fields?: { name: string; type: string; }[];
        importComponent?: string;
        targetFile?: string;
        component?: string;
        props?: { [key: string]: string };
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
            process.env.OPENAI_API_KEY = key;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: `Você é um assistente especializado em interpretar comandos para gerar e modificar código React.
Analise a solicitação e retorne um JSON com a estrutura adequada.

Ao analisar a solicitação, identifique:
1. Tipo de ação (criar, editar, deletar, importar)
2. Tipo de componente (tabela, formulário, página, componente)
3. Nome do componente (use PascalCase)
4. Features necessárias:
   - Para tabelas: identifique se precisa de paginação, filtros, busca, ordenação
   - Para formulários: identifique campos e validações
   - Para todos: identifique integrações com API, estados, etc.
5. Para comandos de importação/uso de componentes:
   - Identifique o componente a ser importado
   - Identifique o arquivo destino
   - Identifique props necessárias

Exemplos de interpretação:
"Crie uma tabela de usuários com paginação" =>
{
  "action": "create",
  "componentType": "table",
  "newName": "UserTable",
  "features": [
    {
      "type": "table",
      "fields": [
        {"name": "id", "type": "number"},
        {"name": "name", "type": "string"},
        {"name": "email", "type": "string"}
      ]
    },
    {"type": "pagination"}
  ]
}

"Carregue a tabela UserTable no App.js" =>
{
  "action": "edit",
  "componentType": "component",
  "oldName": "App",
  "newName": "App",
  "features": [
    {
      "type": "import",
      "importComponent": "UserTable",
      "targetFile": "App.js"
    },
    {
      "type": "usage",
      "component": "UserTable",
      "props": {
        "data": "[]",
        "onEdit": "(item) => console.log('Edit:', item)",
        "onDelete": "(id) => console.log('Delete:', id)"
      }
    }
  ]
}`
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
                                                    description: "Tipo da feature (table, form, pagination, filters, search, sorting, import, usage)"
                                                },
                                                importComponent: {
                                                    type: "string",
                                                    description: "Nome do componente a ser importado"
                                                },
                                                targetFile: {
                                                    type: "string",
                                                    description: "Arquivo onde o componente será usado"
                                                },
                                                component: {
                                                    type: "string",
                                                    description: "Nome do componente a ser usado"
                                                },
                                                props: {
                                                    type: "object",
                                                    description: "Props a serem passadas para o componente"
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

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 408 || response.status === 504) {
                    throw new Error('Tempo limite excedido. Por favor, tente novamente.');
                }
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
                if (error.name === 'AbortError') {
                    throw new Error('A solicitação demorou muito para responder. Por favor, tente novamente.');
                }
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