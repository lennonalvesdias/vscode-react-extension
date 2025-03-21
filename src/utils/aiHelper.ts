import OpenAI from 'openai';
import { AIResponse } from '../templates/types';
import * as vscode from 'vscode';

export class AIHelper {
    private openai!: OpenAI;

    constructor() {
        const config = vscode.workspace.getConfiguration('reactChat');
        const apiKey = config.get<string>('openaiApiKey');
        
        if (!apiKey) {
            throw new Error('OpenAI API Key não encontrada. Por favor, configure a chave em suas configurações do VS Code (reactChat.openaiApiKey)');
        }

        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    public async parseRequest(request: string): Promise<AIResponse> {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente especializado em React que ajuda a criar, editar e excluir componentes.'
                },
                {
                    role: 'user',
                    content: request
                }
            ]
        });

        const result = response.choices[0]?.message?.content;
        if (!result) {
            throw new Error('Resposta inválida da API');
        }

        try {
            const parsedResult = JSON.parse(result);
            return {
                action: parsedResult.action,
                oldName: parsedResult.oldName,
                newName: parsedResult.newName,
                componentType: parsedResult.componentType,
                features: parsedResult.features || []
            };
        } catch (error) {
            throw new Error('Erro ao processar resposta da API');
        }
    }
} 