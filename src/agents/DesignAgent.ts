import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext, AnalysisResult, DesignSystemCompliance } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { DesignSystemService } from '../services/DesignSystemService';

export class DesignAgent implements Agent {
  private openAIService: OpenAIService;
  private designSystemService: DesignSystemService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.designSystemService = new DesignSystemService(context);
  }

  get name(): string {
    return 'DesignAgent';
  }

  get description(): string {
    return 'Garante que os componentes estejam aderentes ao design system';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      // Analisa a solicitação usando IA
      const analysis = await this.openAIService.analyzeRequest(message.content);

      // Verifica a aderência ao design system
      const designSystemCompliance = await this.designSystemService.checkCompliance(analysis);

      return {
        role: 'assistant',
        type: 'response',
        content: designSystemCompliance.recommendations.join('\n'),
        metadata: {
          analysis,
          compliance: designSystemCompliance
        }
      };
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na análise de design: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
