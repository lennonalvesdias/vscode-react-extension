import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';

export class ProductManagerAgent implements Agent {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  get name(): string {
    return 'ProductManagerAgent';
  }

  get description(): string {
    return 'Garante o alinhamento com os objetivos do negócio';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const analysis = await this.openAIService.analyzeRequest(message.content);
      const alignment = await this.openAIService.analyzeBusinessAlignment(message.content);

      return {
        role: 'assistant',
        type: 'response',
        content: alignment,
        metadata: {
          analysis,
          alignment: {
            isAligned: alignment.includes('Score: 80') || alignment.includes('Score: 100'),
            impact: 'medium',
            recommendations: []
          }
        }
      };
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na análise de negócio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
