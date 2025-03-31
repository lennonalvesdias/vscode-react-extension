import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface CodeGenerationResult {
    code: string;
    tests: string;
    documentation: string;
}

export class CodeGenerator {
    private openAIService: OpenAIService;

    constructor(private context: AgentContext) {
        this.openAIService = new OpenAIService(context);
    }

    async generateCode(analysis: any): Promise<CodeGenerationResult> {
        try {
            const prompt = this.buildPrompt(analysis);
            const response = await this.openAIService.generateCode(prompt);

            return {
                code: response.code,
                tests: response.tests,
                documentation: response.documentation
            };
        } catch (error) {
            throw new Error(`Erro na geração de código: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    private buildPrompt(analysis: any): string {
        return `
            Gere um componente React com as seguintes especificações:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Dependências: ${analysis.dependencies.join(', ')}
            Descrição: ${analysis.description}

            O código deve seguir:
            1. Padrões de projeto React modernos
            2. TypeScript em modo strict
            3. Componentes funcionais com hooks
            4. Testes unitários com Jest e React Testing Library
            5. Documentação JSDoc
            6. Design System corporativo
            7. Boas práticas de performance
        `;
    }
}
