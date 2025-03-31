import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';

export class SecurityAgent implements Agent {
  private openAIService: OpenAIService;

  constructor(context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  get name(): string {
    return 'SecurityAgent';
  }

  get description(): string {
    return 'Garante a segurança dos componentes';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const analysis = await this.openAIService.analyzeSecurity(message.content);

      return {
        role: 'assistant',
        type: 'response',
        content: `Análise de segurança:\n${analysis}`,
        metadata: {
          analysis
        }
      };
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na análise de segurança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
