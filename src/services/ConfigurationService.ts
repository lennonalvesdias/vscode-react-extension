import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { SecurityService } from './SecurityService';

/**
 * Serviço para gerenciar configurações da extensão
 */
export class ConfigurationService {
  private readonly API_KEY_CONFIG = 'psCopilot.apiKey';
  private readonly API_KEY_SECRET = 'ps-copilot-api-key';
  private securityService: SecurityService;

  constructor(private context: AgentContext) {
    this.securityService = new SecurityService(this.context);
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

  async setApiKey(apiKey: string): Promise<void> {
    try {
      // Valida a API Key
      if (!apiKey.trim()) {
        throw new Error('API Key não pode estar vazia');
      }

      if (!apiKey.startsWith('sk-')) {
        throw new Error('API Key deve começar com "sk-"');
      }

      // Armazena a API Key de forma segura
      await this.securityService.secureStore(this.API_KEY_SECRET, apiKey);

      // Também atualiza no globalState para garantir que todos os serviços usem a mesma API key
      await this.context.globalState.update(this.API_KEY_SECRET, apiKey);

      // Registra a ação no log de auditoria
      this.securityService.logAudit('setApiKey', {
        success: true,
        timestamp: new Date().toISOString()
      });

      vscode.window.showInformationMessage('API Key configurada com sucesso!');
    } catch (error) {
      this.securityService.logAudit('setApiKey', {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error(`Erro ao configurar API Key: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obtém a API Key armazenada no keytar ou nas configurações
   * Este é o método principal para obter a API key que deve ser usado por todos os serviços
   */
  public async getApiKey(): Promise<string | undefined> {
    try {
      // Primeiro tenta obter do serviço seguro
      let apiKey = await this.securityService.secureRetrieve(this.API_KEY_SECRET);

      // Se não encontrar, tenta o globalState
      if (!apiKey) {
        apiKey = this.context.globalState.get<string>(this.API_KEY_SECRET);
      }

      // Por último, verifica nas configurações (menos seguro)
      if (!apiKey) {
        apiKey = vscode.workspace.getConfiguration().get<string>(this.API_KEY_CONFIG);
      }

      return apiKey;
    } catch (error) {
      console.error('Erro ao recuperar API Key:', error);
      return undefined;
    }
  }

  /**
   * Remove a API Key do armazenamento
   */
  public async clearApiKey(): Promise<void> {
    try {
      // Limpa de todos os locais de armazenamento para garantir consistência
      await this.securityService.secureDelete(this.API_KEY_SECRET);
      await this.context.globalState.update(this.API_KEY_SECRET, undefined);

      // Registra a ação no log de auditoria
      this.securityService.logAudit('clearApiKey', {
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao limpar API Key:', error);
      this.securityService.logAudit('clearApiKey', {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }

  async hasApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return !!apiKey;
    } catch {
      return false;
    }
  }

  public getModel(): string {
    return this.context.globalState.get<string>('psCopilot.model') || 'gpt-3.5-turbo';
  }

  public async setModel(model: string): Promise<void> {
    await this.context.globalState.update('psCopilot.model', model);
  }

  public getTemperature(): number {
    return this.context.globalState.get<number>('psCopilot.temperature') || 0.7;
  }

  public async setTemperature(temperature: number): Promise<void> {
    await this.context.globalState.update('psCopilot.temperature', temperature);
  }

  public getMaxTokens(): number {
    return this.context.globalState.get<number>('psCopilot.maxTokens') || 2000;
  }

  public async setMaxTokens(maxTokens: number): Promise<void> {
    await this.context.globalState.update('psCopilot.maxTokens', maxTokens);
  }

  public getTimeout(): number {
    return this.context.globalState.get<number>('psCopilot.timeout') || 30000;
  }

  public async setTimeout(timeout: number): Promise<void> {
    await this.context.globalState.update('psCopilot.timeout', timeout);
  }
}
