import { AgentContext } from '../agents/types';

export class SecurityService {
  constructor(private context: AgentContext) {
  }

  logAudit(action: string, details: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      ...details
    };

    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
  }

  async secureStore(key: string, value: string): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  async secureRetrieve(key: string): Promise<string | undefined> {
    return this.context.globalState.get<string>(key);
  }

  async secureDelete(key: string): Promise<void> {
    await this.context.globalState.update(key, undefined);
  }
}
