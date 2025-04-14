import { AgentContext } from '../agents/types';

export class SecurityService {
  constructor(private context: AgentContext) {
  }

  sanitizeInput(input: string): string {
    // Remove caracteres potencialmente perigosos
    return input.trim().replace(/[<>]/g, '');
  }

  validateCode(code: string): boolean {
    // Verifica padrões perigosos no código
    const dangerousPatterns = [
      /eval\s*\(/i,
      /new\s+Function\s*\(/i,
      /localStorage/i,
      /document\.cookie/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(code));
  }

  logAudit(action: string, details: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      ...details
    };

    // Aqui você pode implementar a lógica de logging adequada
    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
  }

  async secureStore(key: string, value: string): Promise<void> {
    // Armazena o valor de forma segura usando o globalState do VS Code
    await this.context.globalState.update(key, value);
  }

  async secureRetrieve(key: string): Promise<string | undefined> {
    // Recupera o valor armazenado de forma segura
    return this.context.globalState.get<string>(key);
  }

  async secureDelete(key: string): Promise<void> {
    // Remove o valor armazenado
    await this.context.globalState.update(key, undefined);
  }
}
