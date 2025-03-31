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
    key: string;
  }>;
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;

    // Definição inicial dos agentes com suas chaves
    this.agents = [
      { agent: new DeveloperAgent(context), isEnabled: true, key: 'developer' },
      { agent: new DesignAgent(context), isEnabled: true, key: 'design' },
      { agent: new ProductManagerAgent(context), isEnabled: true, key: 'product' },
      { agent: new TestAgent(context), isEnabled: true, key: 'test' },
      { agent: new ArchitectureAgent(context), isEnabled: true, key: 'architecture' },
      { agent: new PerformanceAgent(context), isEnabled: true, key: 'performance' },
      { agent: new SecurityAgent(context), isEnabled: true, key: 'security' },
      { agent: new AccessibilityAgent(context), isEnabled: true, key: 'accessibility' }
    ];

    // Carrega o estado dos agentes do globalState
    this.loadAgentStates();
  }

  private loadAgentStates() {
    const savedStates = this.context.globalState.get<Record<string, boolean>>('agentStates');
    if (savedStates) {
      // Atualiza o estado dos agentes com os valores salvos
      for (const agent of this.agents) {
        if (agent.key in savedStates) {
          agent.isEnabled = savedStates[agent.key];
        }
      }
    }
  }

  public setAgentState(agentName: string, isEnabled: boolean): void {
    const agent = this.agents.find(a => a.agent.name === agentName);
    if (agent) {
      agent.isEnabled = isEnabled;

      // Salva o estado atualizado no globalState
      const savedStates = this.context.globalState.get<Record<string, boolean>>('agentStates') || {};
      savedStates[agent.key] = isEnabled;
      this.context.globalState.update('agentStates', savedStates);
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
