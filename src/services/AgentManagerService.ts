import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { CoreCoordinator } from '../agents/CoreCoordinator';

interface AgentState {
  enabled: boolean;
  name: string;
  description: string;
}

export class AgentManagerService {
  private agentStates: Map<string, AgentState>;
  private coordinator: CoreCoordinator;

  constructor(private context: AgentContext) {
    this.agentStates = new Map();
    this.coordinator = new CoreCoordinator(context);
    this.initializeAgentStates();
  }

  private initializeAgentStates() {
    // Inicializa o estado dos agentes com valores padrão
    this.agentStates.set('developer', { enabled: true, name: 'DeveloperAgent', description: 'Responsável por gerar código React de alta qualidade' });
    this.agentStates.set('design', { enabled: true, name: 'DesignAgent', description: 'Garante que os componentes estejam aderentes ao design system' });
    this.agentStates.set('product', { enabled: true, name: 'ProductManagerAgent', description: 'Garante que as funcionalidades estejam alinhadas aos objetivos do negócio' });
    this.agentStates.set('test', { enabled: true, name: 'TestAgent', description: 'Garante a qualidade dos testes dos componentes' });
    this.agentStates.set('architecture', { enabled: true, name: 'ArchitectureAgent', description: 'Garante a consistência arquitetural dos componentes' });
    this.agentStates.set('performance', { enabled: true, name: 'PerformanceAgent', description: 'Garante a performance dos componentes' });
    this.agentStates.set('security', { enabled: true, name: 'SecurityAgent', description: 'Garante a segurança dos componentes' });
    this.agentStates.set('accessibility', { enabled: true, name: 'AccessibilityAgent', description: 'Garante a acessibilidade dos componentes' });

    // Carrega o estado salvo dos agentes
    this.loadAgentStates();
  }

  private loadAgentStates() {
    const savedStates = this.context.globalState.get<Record<string, boolean>>('agentStates');
    if (savedStates) {
      for (const [key, enabled] of Object.entries(savedStates)) {
        const state = this.agentStates.get(key);
        if (state) {
          state.enabled = enabled;
        }
      }
    }
  }

  private saveAgentStates() {
    const states: Record<string, boolean> = {};
    for (const [key, state] of this.agentStates.entries()) {
      states[key] = state.enabled;
    }
    this.context.globalState.update('agentStates', states);
  }

  getAgentStates(): Array<{ name: string; isEnabled: boolean }> {
    return this.coordinator.getAgentStates();
  }

  setAgentState(agentName: string, isEnabled: boolean): void {
    this.coordinator.setAgentState(agentName, isEnabled);
  }

  getAgentState(agentName: string): boolean {
    const state = this.coordinator.getAgentStates().find(s => s.name === agentName);
    return state?.isEnabled ?? false;
  }

  getAllAgentStates(): AgentState[] {
    return Array.from(this.agentStates.values());
  }

  setAgentEnabled(key: string, enabled: boolean): void {
    const state = this.agentStates.get(key);
    if (state) {
      state.enabled = enabled;
      this.saveAgentStates();
    }
  }

  isAgentEnabled(key: string): boolean {
    return this.agentStates.get(key)?.enabled ?? false;
  }

  getEnabledAgents(): string[] {
    return Array.from(this.agentStates.entries())
      .filter(([_, state]) => state.enabled)
      .map(([key]) => key);
  }
}
