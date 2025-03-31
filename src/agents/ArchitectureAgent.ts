import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { ArchitectureService } from '../services/ArchitectureService';

export class ArchitectureAgent implements Agent {
  private openAIService: OpenAIService;
  private architectureService: ArchitectureService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.architectureService = new ArchitectureService(context);
  }

  get name(): string {
    return 'ArchitectureAgent';
  }

  get description(): string {
    return 'Garante a consistência arquitetural dos componentes';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      // Analisa a solicitação usando IA
      const analysis = await this.openAIService.analyzeArchitecture(message.content);

      // Verifica a consistência arquitetural
      const architectureCheck = await this.architectureService.checkConsistency(analysis);

      // Retorna recomendações ou erros
      if (architectureCheck.score >= 80) {
        return {
          role: 'assistant',
          type: 'response',
          content: `Análise arquitetural concluída com sucesso!\n\nRecomendações:\n${architectureCheck.recommendations.join('\n')}\n\nScore: ${architectureCheck.score}`,
          metadata: { analysis }
        };
      } else {
        return {
          role: 'assistant',
          type: 'response',
          content: `Problemas de consistência arquitetural encontrados:\n\nProblemas:\n${architectureCheck.issues.join('\n')}\n\nRecomendações:\n${architectureCheck.recommendations.join('\n')}\n\nScore: ${architectureCheck.score}`,
          metadata: { analysis }
        };
      }
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na análise arquitetural: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
