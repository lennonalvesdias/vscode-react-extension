import { AgentContext } from '../agents/types';
import { CoreCoordinator } from '../agents/CoreCoordinator';

export class AgentManagerService {
  private agentStates: Record<string, boolean> = {};
  private coordinator: CoreCoordinator;

  constructor(private context: AgentContext) {
    this.coordinator = new CoreCoordinator(context);
    this.initializeAgentStates();
  }

  private initializeAgentStates() {
    // Inicializa o estado dos agentes com valores padrão
    this.agentStates['developer'] = true;
    this.agentStates['design'] = true;
    this.agentStates['product'] = true;
    this.agentStates['test'] = true;
    this.agentStates['architecture'] = true;
    this.agentStates['performance'] = true;
    this.agentStates['security'] = true;
    this.agentStates['accessibility'] = true;

    // Carrega o estado salvo dos agentes
    this.loadAgentStates();
  }

  private loadAgentStates() {
    const savedStates = this.context.globalState.get<Record<string, boolean>>('agentStates');
    if (savedStates) {
      for (const [key, enabled] of Object.entries(savedStates)) {
        this.agentStates[key] = enabled;
      }
    }
  }

  private saveAgentStates() {
    this.context.globalState.update('agentStates', { ...this.agentStates });
  }

  getAgentStates(): Array<{ name: string; isEnabled: boolean }> {
    return this.coordinator.getAgentStates();
  }

  setAgentState(agentName: string, enabled: boolean): void {
    this.agentStates[agentName] = enabled;
    this.saveAgentStates();
  }

  getAgentState(agentName: string): boolean {
    return this.agentStates[agentName] ?? true;
  }

  getAllAgentStates(): Record<string, boolean> {
    return { ...this.agentStates };
  }

  setAgentEnabled(key: string, enabled: boolean): void {
    this.agentStates[key] = enabled;
    this.saveAgentStates();
  }

  isAgentEnabled(key: string): boolean {
    return this.agentStates[key] ?? false;
  }

  getEnabledAgents(): string[] {
    return Object.entries(this.agentStates)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);
  }
}
