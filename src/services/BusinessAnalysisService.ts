import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface BusinessAlignment {
  recommendations: string[];
  issues: string[];
  score: number;
  businessValue: string;
}

export class BusinessAnalysisService {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  async checkAlignment(analysis: any): Promise<BusinessAlignment> {
    try {
      const prompt = this.buildPrompt(analysis);
      const response = await this.openAIService.analyzeBusinessAlignment(prompt);

      return this.parseAlignment(response);
    } catch (error) {
      throw new Error(`Erro na análise de negócio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private buildPrompt(analysis: any): string {
    return `
            Analise o alinhamento com os objetivos do negócio do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Alinhamento com a estratégia do produto
            2. Valor para o usuário final
            3. Impacto no negócio
            4. Priorização
            5. Dependências de negócio
            6. Riscos e oportunidades
            7. Métricas de sucesso
        `;
  }

  private parseAlignment(response: string): BusinessAlignment {
    // Implementa a lógica de parsing da resposta
    const lines = response.split('\n');
    const alignment: BusinessAlignment = {
      recommendations: [],
      issues: [],
      score: 0,
      businessValue: ''
    };

    for (const line of lines) {
      if (line.toLowerCase().includes('recomendação:')) {
        alignment.recommendations.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('problema:')) {
        alignment.issues.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('score:')) {
        const score = parseInt(line.split(':')[1].trim());
        if (!isNaN(score)) {
          alignment.score = score;
        }
      }
      else if (line.toLowerCase().includes('valor:')) {
        alignment.businessValue = line.split(':')[1].trim();
      }
    }

    return alignment;
  }
}
