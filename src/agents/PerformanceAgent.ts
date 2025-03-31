import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { PerformanceService } from '../services/PerformanceService';

export class PerformanceAgent implements Agent {
  private openAIService: OpenAIService;
  private performanceService: PerformanceService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.performanceService = new PerformanceService(context);
  }

  get name(): string {
    return 'PerformanceAgent';
  }

  get description(): string {
    return 'Garante a performance dos componentes';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const analysis = await this.openAIService.analyzePerformance(message.content);

      return {
        role: 'assistant',
        type: 'response',
        content: analysis,
        metadata: { analysis }
      };
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na análise de performance: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
