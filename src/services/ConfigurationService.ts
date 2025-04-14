import { AgentContext } from '../agents/types';

/**
 * Serviço para gerenciar configurações da extensão
 */
export class ConfigurationService {
  constructor(private context: AgentContext) {
  }

  async getConfiguration(key: string): Promise<string | undefined> {
    return this.context.globalState.get(key);
  }

  async setConfiguration(key: string, value: string): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  async deleteConfiguration(key: string): Promise<void> {
    await this.context.globalState.update(key, undefined);
  }
}
