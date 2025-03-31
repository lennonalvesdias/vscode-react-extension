import * as vscode from 'vscode';
import { AgentContext } from '../agents/types';
import { SecurityService } from './SecurityService';

export class ConfigurationService {
  private readonly API_KEY_KEY = 'openai.apiKey';
  private securityService: SecurityService;

  constructor(private context: vscode.ExtensionContext) {
    const agentContext: AgentContext = {
      extensionUri: context.extensionUri,
      extensionPath: context.extensionPath,
      globalState: context.globalState,
      workspaceState: context.workspaceState,
      configuration: vscode.workspace.getConfiguration('psCopilot')
    };
    this.securityService = new SecurityService(agentContext);
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
      // Sanitiza a API Key
      const sanitizedKey = this.securityService.sanitizeInput(apiKey);

      // Armazena a API Key de forma segura
      await this.securityService.secureStore(this.API_KEY_KEY, sanitizedKey);

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

  async getApiKey(): Promise<string | undefined> {
    try {
      return await this.securityService.secureRetrieve(this.API_KEY_KEY);
    } catch (error) {
      this.securityService.logAudit('getApiKey', {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error(`Erro ao recuperar API Key: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async deleteApiKey(): Promise<void> {
    try {
      await this.securityService.secureDelete(this.API_KEY_KEY);
      this.securityService.logAudit('deleteApiKey', {
        success: true,
        timestamp: new Date().toISOString()
      });
      vscode.window.showInformationMessage('API Key removida com sucesso!');
    } catch (error) {
      this.securityService.logAudit('deleteApiKey', {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      throw new Error(`Erro ao remover API Key: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
}
