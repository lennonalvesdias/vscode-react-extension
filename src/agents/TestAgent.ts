import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { TestService } from '../services/TestService';

export class TestAgent implements Agent {
  private openAIService: OpenAIService;
  private testService: TestService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.testService = new TestService(context);
  }

  get name(): string {
    return 'TestAgent';
  }

  get description(): string {
    return 'Garante a qualidade dos testes dos componentes';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      // Analisa a solicitação usando IA
      const analysis = await this.openAIService.analyzeTestQuality(message.content);

      // Verifica a qualidade dos testes
      const testCheck = await this.testService.checkQuality(analysis);

      // Retorna recomendações ou erros
      if (testCheck.score >= 80) {
        return {
          role: 'assistant',
          type: 'response',
          content: `Análise de testes concluída com sucesso!\n\nRecomendações:\n${testCheck.recommendations.join('\n')}\n\nScore: ${testCheck.score}`,
          metadata: { analysis }
        };
      } else {
        return {
          role: 'assistant',
          type: 'response',
          content: `Problemas na qualidade dos testes encontrados:\n\nProblemas:\n${testCheck.issues.join('\n')}\n\nRecomendações:\n${testCheck.recommendations.join('\n')}\n\nScore: ${testCheck.score}`,
          metadata: { analysis }
        };
      }
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na análise de testes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
