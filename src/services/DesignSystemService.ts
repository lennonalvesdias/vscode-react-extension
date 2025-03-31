import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface DesignSystemCompliance {
    recommendations: string[];
    issues: string[];
    score: number;
}

export class DesignSystemService {
    private openAIService: OpenAIService;

    constructor(private context: AgentContext) {
        this.openAIService = new OpenAIService(context);
    }

    async checkCompliance(analysis: any): Promise<DesignSystemCompliance> {
        try {
            const prompt = this.buildPrompt(analysis);
            const response = await this.openAIService.analyzeDesignCompliance(prompt);

            return this.parseCompliance(response);
        } catch (error) {
            throw new Error(`Erro na verificação do design system: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    private buildPrompt(analysis: any): string {
        return `
            Analise a aderência ao design system do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Uso correto de cores, tipografia e espaçamentos
            2. Consistência com componentes existentes
            3. Responsividade e acessibilidade
            4. Padrões de interação
            5. Animações e transições
            6. Estados (hover, focus, disabled, etc.)
            7. Feedback visual
        `;
    }

    private parseCompliance(response: string): DesignSystemCompliance {
        // Implementa a lógica de parsing da resposta
        const lines = response.split('\n');
        const compliance: DesignSystemCompliance = {
            recommendations: [],
            issues: [],
            score: 0
        };

        for (const line of lines) {
            if (line.toLowerCase().includes('recomendação:')) {
                compliance.recommendations.push(line.split(':')[1].trim());
            }
            else if (line.toLowerCase().includes('problema:')) {
                compliance.issues.push(line.split(':')[1].trim());
            }
            else if (line.toLowerCase().includes('score:')) {
                const score = parseInt(line.split(':')[1].trim());
                if (!isNaN(score)) {
                    compliance.score = score;
                }
            }
        }

        return compliance;
    }
}
