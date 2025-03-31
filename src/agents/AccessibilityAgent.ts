import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';

export class AccessibilityAgent implements Agent {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  get name(): string {
    return 'AccessibilityAgent';
  }

  get description(): string {
    return 'Garante a acessibilidade dos componentes';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const analysis = await this.openAIService.analyzeAccessibility(message.content);

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
        content: `Erro na análise de acessibilidade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
