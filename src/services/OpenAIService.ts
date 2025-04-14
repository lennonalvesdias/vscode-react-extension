// import axios from 'axios';
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { AgentContext } from '../agents/types';

export class OpenAIService {
  private openai: OpenAI | null = null;
  private apiKey: string | undefined;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;
  private apiUrl: string | undefined;

  constructor(context: AgentContext) {
    this.apiKey = context.apiKey || vscode.workspace.getConfiguration('psCopilot').get('apiKey');
    this.model = context.model || 'gpt-4o';
    this.temperature = context.temperature ?? 0.2;
    this.maxTokens = context.maxTokens ?? 4000;
    this.timeout = (context.timeout ?? 120) * 1000; // Convert to ms
    this.apiUrl = context.apiUrl || vscode.workspace.getConfiguration('psCopilot').get('apiUrl') || undefined;

    if (this.apiKey) {
      this.initializeOpenAI();
    }
  }

  private initializeOpenAI(): void {
    if (!this.apiKey) { return; }
    try {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.apiUrl, // Passa a URL customizada ou undefined (usa padrão OpenAI)
        timeout: this.timeout,
      });
      console.log("OpenAI Service Initialized", this.apiUrl ? `with API URL: ${this.apiUrl}` : 'with default API URL');
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao inicializar OpenAI: ${error}`);
      this.openai = null;
    }
  }

  public updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.initializeOpenAI(); // Reinitialize with the new key
  }

  public hasApiKey(): boolean {
    return !!this.apiKey && !!this.openai;
  }

  private validateApiKey(): void {
    if (!this.hasApiKey()) {
      this.apiKey = vscode.workspace.getConfiguration('psCopilot').get('apiKey');
      if (this.apiKey) {
        this.initializeOpenAI();
      } else {
        throw new Error('API Key da OpenAI não configurada. Configure-a nas configurações do VS Code.');
      }
    }
    if (!this.openai) {
      throw new Error('Cliente OpenAI não inicializado corretamente.');
    }
  }

  // Método privado para realizar a chamada à API
  private async makeRequest(systemPrompt: string, userContent: string): Promise<string> {
    this.validateApiKey();
    if (!this.openai) { throw new Error('OpenAI client not available'); }

    console.log('--- OpenAI Request ---');
    console.log('Model:', this.model);
    console.log('System Prompt (preview):', systemPrompt.substring(0, 100) + '...');
    console.log('User Content (preview):', userContent.substring(0, 100) + '...');
    console.log('---------------------');

    try {
      const start = Date.now();
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      });
      const duration = Date.now() - start;
      console.log(`OpenAI request took ${duration}ms`);

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error('Resposta inesperada da API OpenAI.');
      }
      console.log('--- OpenAI Response (preview) ---');
      console.log(result.substring(0, 200) + '...');
      console.log('---------------------');
      return result;
    } catch (error: any) {
      console.error('Erro na chamada da API OpenAI:', error);
      if (error.response) {
        console.error('API Error Status:', error.response.status);
        console.error('API Error Data:', error.response.data);
      }
      throw new Error(`Erro ao comunicar com a API OpenAI: ${error.message}`);
    }
  }

  // *** Métodos Públicos Simplificados ***

  /**
   * Realiza uma chamada genérica para chat.
   * @param userMessage A mensagem do usuário.
   * @returns A resposta de texto da API.
   */
  async chat(userMessage: string): Promise<string> {
    console.log('OpenAIService: Chamando chat (via makeRequest)');
    // Usar um prompt de sistema padrão para chat genérico
    const systemPrompt = 'Você é um assistente de IA útil.';
    return this.makeRequest(systemPrompt, userMessage);
  }

  /**
   * Realiza uma chamada genérica para geração de código.
   * @param systemPrompt O prompt do sistema (instruções para a IA).
   * @param userContent O conteúdo do usuário (descrição, código existente, etc.).
   * @returns A resposta de texto da API.
   */
  async generateCode(systemPrompt: string, userContent: string): Promise<string> {
    console.log('OpenAIService: Chamando generateCode (via makeRequest)');
    return this.makeRequest(systemPrompt, userContent);
  }

  /**
   * Realiza uma chamada genérica para análise de conformidade de design.
   * @param systemPrompt O prompt do sistema (instruções para a IA).
   * @param userContent O conteúdo do usuário (código para analisar, descrição).
   * @returns A resposta de texto da API.
   */
  async analyzeDesignCompliance(systemPrompt: string, userContent: string): Promise<string> {
    console.log('OpenAIService: Chamando analyzeDesignCompliance (via makeRequest)');
    return this.makeRequest(systemPrompt, userContent);
  }

  /**
   * Realiza uma chamada genérica para geração de testes.
   * @param systemPrompt O prompt do sistema (instruções para a IA).
   * @param userContent O conteúdo do usuário (código para testar, descrição).
   * @returns A resposta de texto da API.
   */
  async generateTests(systemPrompt: string, userContent: string): Promise<string> {
    console.log('OpenAIService: Chamando generateTests (via makeRequest)');
    return this.makeRequest(systemPrompt, userContent);
  }
}
