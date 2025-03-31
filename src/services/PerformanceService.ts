import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { OpenAIService } from './OpenAIService';

interface PerformanceCheck {
  recommendations: string[];
  issues: string[];
  score: number;
  metrics: {
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
  };
}

export class PerformanceService {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  async checkPerformance(analysis: any): Promise<PerformanceCheck> {
    try {
      const prompt = this.buildPrompt(analysis);
      const response = await this.openAIService.analyzePerformance(prompt);

      return this.parsePerformance(response);
    } catch (error) {
      throw new Error(`Erro na análise de performance: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private buildPrompt(analysis: any): string {
    return `
            Analise a performance do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Tempo de carregamento
            2. Tempo de renderização
            3. Uso de memória
            4. Otimizações
            5. Lazy loading
            6. Caching
            7. Bundle size
            8. Code splitting
        `;
  }

  private parsePerformance(response: string): PerformanceCheck {
    // Implementa a lógica de parsing da resposta
    const lines = response.split('\n');
    const performance: PerformanceCheck = {
      recommendations: [],
      issues: [],
      score: 0,
      metrics: {
        loadTime: 0,
        renderTime: 0,
        memoryUsage: 0
      }
    };

    for (const line of lines) {
      if (line.toLowerCase().includes('recomendação:')) {
        performance.recommendations.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('problema:')) {
        performance.issues.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('score:')) {
        const score = parseInt(line.split(':')[1].trim());
        if (!isNaN(score)) {
          performance.score = score;
        }
      }
      else if (line.toLowerCase().includes('tempo de carregamento:')) {
        const loadTime = parseInt(line.split(':')[1].trim());
        if (!isNaN(loadTime)) {
          performance.metrics.loadTime = loadTime;
        }
      }
      else if (line.toLowerCase().includes('tempo de renderização:')) {
        const renderTime = parseInt(line.split(':')[1].trim());
        if (!isNaN(renderTime)) {
          performance.metrics.renderTime = renderTime;
        }
      }
      else if (line.toLowerCase().includes('uso de memória:')) {
        const memoryUsage = parseInt(line.split(':')[1].trim());
        if (!isNaN(memoryUsage)) {
          performance.metrics.memoryUsage = memoryUsage;
        }
      }
    }

    return performance;
  }
}
