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

  async setApiKey(apiKey: string): Promise<void> {
    try {
      if (!apiKey.trim()) {
        throw new Error('API Key não pode estar vazia');
      }

      if (!apiKey.startsWith('sk-')) {
        throw new Error('API Key deve começar com "sk-"');
      }

      await this.securityService.secureStore(this.API_KEY_SECRET, apiKey);

      await this.context.globalState.update(this.API_KEY_SECRET, apiKey);

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
      let apiKey = await this.securityService.secureRetrieve(this.API_KEY_SECRET);

      if (!apiKey) {
        apiKey = this.context.globalState.get<string>(this.API_KEY_SECRET);
      }

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
   * Verifica se há uma API Key configurada
   */
  public async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== undefined && apiKey !== '';
  }

  /**
   * Remove a API Key do armazenamento
   */
  public async clearApiKey(): Promise<void> {
    try {
      await this.securityService.secureDelete(this.API_KEY_SECRET);
      await this.context.globalState.update(this.API_KEY_SECRET, undefined);

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
}
