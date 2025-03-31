import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface TestQuality {
    recommendations: string[];
    issues: string[];
    score: number;
    coverage: number;
}

export class TestService {
    private openAIService: OpenAIService;

    constructor(private context: AgentContext) {
        this.openAIService = new OpenAIService(context);
    }

    async checkQuality(analysis: any): Promise<TestQuality> {
        try {
            const prompt = this.buildPrompt(analysis);
            const response = await this.openAIService.analyzeTestQuality(prompt);

            return this.parseQuality(response);
        } catch (error) {
            throw new Error(`Erro na análise de qualidade dos testes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    private buildPrompt(analysis: any): string {
        return `
            Analise a qualidade dos testes do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Cobertura de testes
            2. Tipos de testes (unitários, integração, e2e)
            3. Casos de teste
            4. Assertions
            5. Mocks e stubs
            6. Organização dos testes
            7. Boas práticas
            8. Performance dos testes
        `;
    }

    private parseQuality(response: string): TestQuality {
        // Implementa a lógica de parsing da resposta
        const lines = response.split('\n');
        const quality: TestQuality = {
            recommendations: [],
            issues: [],
            score: 0,
            coverage: 0
        };

        for (const line of lines) {
            if (line.toLowerCase().includes('recomendação:')) {
                quality.recommendations.push(line.split(':')[1].trim());
            }
            else if (line.toLowerCase().includes('problema:')) {
                quality.issues.push(line.split(':')[1].trim());
            }
            else if (line.toLowerCase().includes('score:')) {
                const score = parseInt(line.split(':')[1].trim());
                if (!isNaN(score)) {
                    quality.score = score;
                }
            }
            else if (line.toLowerCase().includes('cobertura:')) {
                const coverage = parseInt(line.split(':')[1].trim());
                if (!isNaN(coverage)) {
                    quality.coverage = coverage;
                }
            }
        }

        return quality;
    }
}
