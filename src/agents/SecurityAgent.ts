import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { SecurityService } from '../services/SecurityService';

export class SecurityAgent implements Agent {
  private securityService: SecurityService;
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.securityService = new SecurityService(context);
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
      const sanitizedCode = this.securityService.sanitizeCode(message.content);

      return {
        role: 'assistant',
        type: 'response',
        content: `Análise de segurança:\n${analysis}\n\nCódigo sanitizado:\n${sanitizedCode}`,
        metadata: {
          analysis,
          sanitizedCode
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
