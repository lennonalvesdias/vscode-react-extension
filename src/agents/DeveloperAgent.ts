import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';

export class DeveloperAgent implements Agent {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  get name(): string {
    return 'DeveloperAgent';
  }

  get description(): string {
    return 'Gera código React de alta qualidade';
  }

  async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const result = await this.openAIService.generateCode(message.content);
      const generatedCode = `${result.code}\n\n${result.documentation}`;

      return {
        role: 'assistant',
        type: 'response',
        content: generatedCode,
        metadata: { result }
      };
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro na geração de código: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
