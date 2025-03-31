import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface AccessibilityCheck {
  recommendations: string[];
  issues: string[];
  score: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export class AccessibilityService {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  async checkAccessibility(analysis: any): Promise<AccessibilityCheck> {
    try {
      const prompt = this.buildPrompt(analysis);
      const response = await this.openAIService.analyzeAccessibility(prompt);

      return this.parseAccessibility(response);
    } catch (error) {
      throw new Error(`Erro na análise de acessibilidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private buildPrompt(analysis: any): string {
    return `
            Analise a acessibilidade do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Conformidade com WCAG
            2. Navegação por teclado
            3. Leitores de tela
            4. Contraste de cores
            5. Textos alternativos
            6. Estrutura semântica
            7. Formulários acessíveis
            8. Responsividade
        `;
  }

  private parseAccessibility(response: string): AccessibilityCheck {
    // Implementa a lógica de parsing da resposta
    const lines = response.split('\n');
    const accessibility: AccessibilityCheck = {
      recommendations: [],
      issues: [],
      score: 0,
      wcagLevel: 'A'
    };

    for (const line of lines) {
      if (line.toLowerCase().includes('recomendação:')) {
        accessibility.recommendations.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('problema:')) {
        accessibility.issues.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('score:')) {
        const score = parseInt(line.split(':')[1].trim());
        if (!isNaN(score)) {
          accessibility.score = score;
        }
      }
      else if (line.toLowerCase().includes('wcag:')) {
        const level = line.split(':')[1].trim().toUpperCase();
        if (['A', 'AA', 'AAA'].includes(level)) {
          accessibility.wcagLevel = level as 'A' | 'AA' | 'AAA';
        }
      }
    }

    return accessibility;
  }
}
