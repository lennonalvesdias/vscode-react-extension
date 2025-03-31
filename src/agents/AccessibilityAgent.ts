import * as vscode from 'vscode';
import { Agent, AgentMessage, AgentContext } from './types';
import { OpenAIService } from '../services/OpenAIService';
import { AccessibilityService } from '../services/AccessibilityService';

export class AccessibilityAgent implements Agent {
  private openAIService: OpenAIService;
  private accessibilityService: AccessibilityService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.accessibilityService = new AccessibilityService(context);
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
