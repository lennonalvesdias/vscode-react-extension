import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';

export class DesignAgent implements Agent {
  private openAIService: OpenAIService;

  constructor(context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  get name(): string {
    return 'DesignAgent';
  }

  get description(): string {
    return 'Garante a aderência ao design system';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const analysis = await this.openAIService.analyzeRequest(message.content);
      const compliance = await this.openAIService.analyzeDesignCompliance(message.content);

      return {
        role: 'assistant',
        type: 'response',
        content: compliance,
        metadata: {
          analysis,
          compliance: {
            isCompliant: compliance.includes('Score: 80') || compliance.includes('Score: 100'),
            violations: [],
            suggestions: []
          }
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
