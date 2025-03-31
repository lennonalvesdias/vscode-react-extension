import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';

export class ArchitectureAgent implements Agent {
  private openAIService: OpenAIService;

  constructor(context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  get name(): string {
    return 'ArchitectureAgent';
  }

  get description(): string {
    return 'Garante a consistência arquitetural';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const analysis = await this.openAIService.analyzeArchitecture(message.content);

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
        content: `Erro na análise arquitetural: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
