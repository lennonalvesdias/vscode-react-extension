import { AgentMessage, AgentContext } from './types';
import { DeveloperAgent } from './DeveloperAgent';
import { DesignAgent } from './DesignAgent';
import { ProductManagerAgent } from './ProductManagerAgent';
import { TestAgent } from './TestAgent';
import { ArchitectureAgent } from './ArchitectureAgent';
import { PerformanceAgent } from './PerformanceAgent';
import { SecurityAgent } from './SecurityAgent';
import { AccessibilityAgent } from './AccessibilityAgent';

export class CoreCoordinator {
  private agents: Array<{
    agent: any;
    isEnabled: boolean;
  }>;

  constructor(context: AgentContext) {
    this.agents = [
      { agent: new DeveloperAgent(context), isEnabled: true },
      { agent: new DesignAgent(context), isEnabled: true },
      { agent: new ProductManagerAgent(context), isEnabled: true },
      { agent: new TestAgent(context), isEnabled: true },
      { agent: new ArchitectureAgent(context), isEnabled: true },
      { agent: new PerformanceAgent(context), isEnabled: true },
      { agent: new SecurityAgent(context), isEnabled: true },
      { agent: new AccessibilityAgent(context), isEnabled: true }
    ];
  }

  public setAgentState(agentName: string, isEnabled: boolean): void {
    const agent = this.agents.find(a => a.agent.name === agentName);
    if (agent) {
      agent.isEnabled = isEnabled;
    }
  }

  public getAgentStates(): Array<{ name: string; isEnabled: boolean }> {
    return this.agents.map(a => ({
      name: a.agent.name,
      isEnabled: a.isEnabled
    }));
  }

  public async process(message: AgentMessage): Promise<AgentMessage> {
    try {
      const enabledAgents = this.agents.filter(a => a.isEnabled);
      const responses = await Promise.all(
        enabledAgents.map(async ({ agent }) => {
          try {
            return await agent.process(message);
          } catch (error) {
            return {
              role: 'assistant',
              type: 'error',
              content: `Erro no processamento do agente ${agent.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
              metadata: { error }
            } as AgentMessage;
          }
        })
      );

      const errorResponses = responses.filter(r => r.type === 'error');
      const successfulResponses = responses.filter(r => r.type === 'response');

      if (errorResponses.length === responses.length) {
        return {
          role: 'assistant',
          type: 'error',
          content: 'Todos os agentes falharam no processamento da mensagem.',
          metadata: { errors: errorResponses }
        };
      }

      const consolidatedContent = successfulResponses
        .map(r => r.content)
        .join('\n\n');

      return {
        role: 'assistant',
        type: 'response',
        content: consolidatedContent,
        metadata: { responses: successfulResponses }
      };
    } catch (error) {
      return {
        role: 'assistant',
        type: 'error',
        content: `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: { error }
      };
    }
  }
}
