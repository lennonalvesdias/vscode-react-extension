import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

interface ProjectStructure {
    isTypeScript: boolean;
    hasRouter: boolean;
    dependencies: {
        [key: string]: string;
    };
    srcPath: string;
    routesPath?: string;
    componentsPath?: string;
    pagesPath?: string;
    servicesPath?: string;
}

interface AIResponse {
    action: 'create' | 'edit' | 'delete' | 'import' | 'usage' | 'initialize' | 'setup' | 'route';
    componentType: 'table' | 'form' | 'page' | 'component' | 'service' | 'route' | 'layout';
    oldName?: string;
    newName: string;
    features: {
        type: string;
        fields?: { name: string; type: string; }[];
        importComponent?: string;
        targetFile?: string;
        component?: string;
        props?: { [key: string]: string };
        route?: {
            path: string;
            component: string;
            isPrivate?: boolean;
            layout?: string;
        };
        service?: {
            baseURL?: string;
            endpoints?: { method: string; path: string; }[];
            auth?: boolean;
        };
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
    private projectStructure: ProjectStructure | undefined;

    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
    }

    private async analyzeProject(): Promise<ProjectStructure> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('Nenhum projeto aberto');
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const packageJsonPath = path.join(rootPath, 'package.json');
        const tsConfigPath = path.join(rootPath, 'tsconfig.json');

        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json não encontrado');
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const isTypeScript = fs.existsSync(tsConfigPath);
        const hasRouter = !!(packageJson.dependencies?.['react-router-dom'] || packageJson.dependencies?.['@reach/router']);

        // Detectar estrutura de diretórios
        const srcPath = path.join(rootPath, 'src');
        const possiblePaths = {
            routes: ['routes', 'router', 'navigation'],
            components: ['components', 'shared', 'common'],
            pages: ['pages', 'views', 'screens'],
            services: ['services', 'api', 'http']
        };

        let routesPath, componentsPath, pagesPath, servicesPath;

        if (fs.existsSync(srcPath)) {
            const srcContents = fs.readdirSync(srcPath);
            
            routesPath = possiblePaths.routes.find(p => srcContents.includes(p));
            componentsPath = possiblePaths.components.find(p => srcContents.includes(p));
            pagesPath = possiblePaths.pages.find(p => srcContents.includes(p));
            servicesPath = possiblePaths.services.find(p => srcContents.includes(p));
        }

        return {
            isTypeScript,
            hasRouter,
            dependencies: packageJson.dependencies || {},
            srcPath,
            routesPath: routesPath ? path.join(srcPath, routesPath) : undefined,
            componentsPath: componentsPath ? path.join(srcPath, componentsPath) : undefined,
            pagesPath: pagesPath ? path.join(srcPath, pagesPath) : undefined,
            servicesPath: servicesPath ? path.join(srcPath, servicesPath) : undefined
        };
    }

    public async parseRequest(request: string): Promise<AIResponse> {
        if (!this.projectStructure) {
            this.projectStructure = await this.analyzeProject();
        }

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
            const timeoutId = setTimeout(() => controller.abort(), 30000);

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

Contexto do Projeto:
- TypeScript: ${this.projectStructure.isTypeScript}
- React Router: ${this.projectStructure.hasRouter}
- Estrutura:
  * Src: ${this.projectStructure.srcPath}
  * Routes: ${this.projectStructure.routesPath || 'não encontrado'}
  * Components: ${this.projectStructure.componentsPath || 'não encontrado'}
  * Pages: ${this.projectStructure.pagesPath || 'não encontrado'}
  * Services: ${this.projectStructure.servicesPath || 'não encontrado'}

Ao analisar a solicitação, identifique:
1. Tipo de ação (criar, editar, deletar, importar, inicializar, setup, route)
2. Tipo de componente (tabela, formulário, página, componente, serviço, rota, layout)
3. Nome do componente (use PascalCase)
4. Features necessárias:
   - Para páginas: identifique rota, layout, autenticação
   - Para serviços: identifique endpoints, autenticação, baseURL
   - Para componentes: identifique props, estados, integrações
   - Para rotas: identifique path, componente, proteção

Exemplos de interpretação:
"inicialize o projeto para apontar para a página de login" =>
{
  "action": "initialize",
  "componentType": "page",
  "newName": "LoginPage",
  "features": [
    {
      "type": "page",
      "route": {
        "path": "/login",
        "component": "LoginPage",
        "isPrivate": false
      }
    },
    {
      "type": "service",
      "service": {
        "baseURL": "/api",
        "endpoints": [
          { "method": "POST", "path": "/auth/login" }
        ],
        "auth": true
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
                                        enum: ["create", "edit", "delete", "import", "initialize", "setup", "route"],
                                        description: "Ação a ser executada"
                                    },
                                    componentType: {
                                        type: "string",
                                        enum: ["table", "form", "page", "component", "service", "route", "layout"],
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
                                                    description: "Tipo da feature"
                                                },
                                                route: {
                                                    type: "object",
                                                    properties: {
                                                        path: { type: "string" },
                                                        component: { type: "string" },
                                                        isPrivate: { type: "boolean" },
                                                        layout: { type: "string" }
                                                    }
                                                },
                                                service: {
                                                    type: "object",
                                                    properties: {
                                                        baseURL: { type: "string" },
                                                        endpoints: {
                                                            type: "array",
                                                            items: {
                                                                type: "object",
                                                                properties: {
                                                                    method: { type: "string" },
                                                                    path: { type: "string" }
                                                                }
                                                            }
                                                        },
                                                        auth: { type: "boolean" }
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

            const data = await response.json();
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