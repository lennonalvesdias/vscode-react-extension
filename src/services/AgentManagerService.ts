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

    // Sincroniza o estado dos agentes com o CoreCoordinator
    this.syncAgentStatesWithCoordinator();
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

  private syncAgentStatesWithCoordinator() {
    // Obtém os estados atuais dos agentes do CoreCoordinator
    const coordinatorStates = this.coordinator.getAgentStates();

    // Sincroniza os estados
    for (const state of coordinatorStates) {
      const key = this.getKeyFromName(state.name);
      if (key && key in this.agentStates) {
        // Usa o valor do globalState para configurar o estado no CoreCoordinator
        this.coordinator.setAgentState(state.name, this.agentStates[key]);
      }
    }
  }

  // Função auxiliar para mapear o nome do agente para sua chave
  private getKeyFromName(name: string): string | null {
    // Mapeamento de nomes para chaves
    const nameToKeyMap: Record<string, string> = {
      'Developer Agent': 'developer',
      'Design Agent': 'design',
      'Product Manager Agent': 'product',
      'Test Agent': 'test',
      'Architecture Agent': 'architecture',
      'Performance Agent': 'performance',
      'Security Agent': 'security',
      'Accessibility Agent': 'accessibility'
    };

    return nameToKeyMap[name] || null;
  }

  getAgentStates(): Array<{ name: string; isEnabled: boolean }> {
    return this.coordinator.getAgentStates();
  }

  setAgentState(agentName: string, enabled: boolean): void {
    // Atualiza o estado no CoreCoordinator
    this.coordinator.setAgentState(agentName, enabled);

    // Atualiza o estado local
    const key = this.getKeyFromName(agentName);
    if (key) {
      this.agentStates[key] = enabled;
      this.saveAgentStates();
    }
  }

  getAgentState(agentName: string): boolean {
    const key = this.getKeyFromName(agentName);
    return key ? (this.agentStates[key] ?? true) : true;
  }

  getAllAgentStates(): Record<string, boolean> {
    return { ...this.agentStates };
  }

  setAgentEnabled(key: string, enabled: boolean): void {
    this.agentStates[key] = enabled;
    this.saveAgentStates();

    // Sincroniza com o CoreCoordinator
    const coordinatorStates = this.coordinator.getAgentStates();
    for (const state of coordinatorStates) {
      const stateKey = this.getKeyFromName(state.name);
      if (stateKey === key) {
        this.coordinator.setAgentState(state.name, enabled);
        break;
      }
    }
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
