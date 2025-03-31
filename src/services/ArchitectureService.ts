import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface ArchitectureConsistency {
    recommendations: string[];
    issues: string[];
    score: number;
    patterns: string[];
}

export class ArchitectureService {
    private openAIService: OpenAIService;

    constructor(private context: AgentContext) {
        this.openAIService = new OpenAIService(context);
    }

    async checkConsistency(analysis: any): Promise<ArchitectureConsistency> {
        try {
            const prompt = this.buildPrompt(analysis);
            const response = await this.openAIService.analyzeArchitecture(prompt);

            return this.parseConsistency(response);
        } catch (error) {
            throw new Error(`Erro na análise arquitetural: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    private buildPrompt(analysis: any): string {
        return `
            Analise a consistência arquitetural do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Padrões de projeto utilizados
            2. Consistência com a arquitetura existente
            3. Separação de responsabilidades
            4. Reutilização de componentes
            5. Dependências e acoplamento
            6. Escalabilidade
            7. Manutenibilidade
            8. Testabilidade
        `;
    }

    private parseConsistency(response: string): ArchitectureConsistency {
        // Implementa a lógica de parsing da resposta
        const lines = response.split('\n');
        const consistency: ArchitectureConsistency = {
            recommendations: [],
            issues: [],
            score: 0,
            patterns: []
        };

        for (const line of lines) {
            if (line.toLowerCase().includes('recomendação:')) {
                consistency.recommendations.push(line.split(':')[1].trim());
            }
            else if (line.toLowerCase().includes('problema:')) {
                consistency.issues.push(line.split(':')[1].trim());
            }
            else if (line.toLowerCase().includes('score:')) {
                const score = parseInt(line.split(':')[1].trim());
                if (!isNaN(score)) {
                    consistency.score = score;
                }
            }
            else if (line.toLowerCase().includes('padrão:')) {
                consistency.patterns.push(line.split(':')[1].trim());
            }
        }

        return consistency;
    }
}
