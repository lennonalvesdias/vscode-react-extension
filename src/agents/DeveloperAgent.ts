import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { CodeGenerator } from '../services/CodeGenerator';

export class DeveloperAgent implements Agent {
  private openAIService: OpenAIService;
  private codeGenerator: CodeGenerator;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.codeGenerator = new CodeGenerator(context);
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
