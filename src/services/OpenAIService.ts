import * as vscode from 'vscode';
import OpenAI from 'openai';

export class OpenAIService {
  private openai: OpenAI | null = null;

  private provider: 'openai' | 'azure';
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private timeout: number;

  // Armazenar chaves lidas diretamente
  private apiKey: string | undefined;
  private azureApiKey: string | undefined;
  private azureEndpoint: string | undefined;

  constructor() {
    // Ler configurações diretamente aqui
    const config = vscode.workspace.getConfiguration('psCopilot');
    const azureConfig = vscode.workspace.getConfiguration('psCopilot.azure');

    this.provider = config.get<'openai' | 'azure'>('provider') || 'openai';
    const modelGeneral = config.get<string>('model') || 'gpt-4o';
    const azureDeployment = azureConfig.get<string>('deploymentName') || modelGeneral;

    this.model = this.provider === 'azure' ? azureDeployment : modelGeneral;
    this.temperature = config.get<number>('temperature') ?? 0.2;
    this.maxTokens = config.get<number>('maxTokens') ?? 4000;
    this.timeout = (config.get<number>('timeout') ?? 120) * 1000;

    if (this.provider === 'azure') {
      this.azureApiKey = azureConfig.get('apiKey');
      this.azureEndpoint = azureConfig.get('endpoint');
      console.log(`Provider selecionado: Azure OpenAI (Endpoint: ${this.azureEndpoint}, Deployment: ${this.model})`);
    } else {
      this.apiKey = config.get('apiKey');
      console.log(`Provider selecionado: OpenAI (Model: ${this.model})`);
    }

    this.initializeOpenAI();

    // Ouvir mudanças nas configurações para reinicializar
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('psCopilot')) {
        console.log('Configurações do PS Copilot mudaram, reinicializando OpenAIService...');
        // Re-ler todas as configs e reinicializar
        const newConfig = vscode.workspace.getConfiguration('psCopilot');
        const newAzureConfig = vscode.workspace.getConfiguration('psCopilot.azure');
        this.provider = newConfig.get<'openai' | 'azure'>('provider') || 'openai';
        const newModelGeneral = newConfig.get<string>('model') || 'gpt-4o';
        const newAzureDeployment = newAzureConfig.get<string>('deploymentName') || newModelGeneral;
        this.model = this.provider === 'azure' ? newAzureDeployment : newModelGeneral;
        this.temperature = newConfig.get<number>('temperature') ?? 0.2;
        this.maxTokens = newConfig.get<number>('maxTokens') ?? 4000;
        this.timeout = (newConfig.get<number>('timeout') ?? 120) * 1000;
        if (this.provider === 'azure') {
          this.azureApiKey = newAzureConfig.get('apiKey');
          this.azureEndpoint = newAzureConfig.get('endpoint');
        } else {
          this.apiKey = newConfig.get('apiKey');
        }
        this.initializeOpenAI();
      }
    });
  }

  private initializeOpenAI(): void {
    try {
      if (this.provider === 'azure') {
        if (!this.azureApiKey || !this.azureEndpoint || !this.model) {
          console.error('Configuração incompleta para Azure OpenAI...');
          this.openai = null;
          return;
        }
        this.openai = new OpenAI({
          apiKey: this.azureApiKey,
          baseURL: `${this.azureEndpoint}/openai/deployments/${this.model}`,
          defaultQuery: { 'api-version': '2024-02-01' },
          defaultHeaders: { 'api-key': this.azureApiKey },
          timeout: this.timeout,
        });
        console.log(`Azure OpenAI Service Initialized...`);
      } else {
        if (!this.apiKey) {
          console.error('API Key da OpenAI não fornecida.');
          this.openai = null;
          return;
        }
        this.openai = new OpenAI({
          apiKey: this.apiKey,
          timeout: this.timeout,
        });
        console.log(`Standard OpenAI Service Initialized...`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao inicializar cliente OpenAI (${this.provider}): ${error}`);
      this.openai = null;
    }
  }

  public hasApiKey(): boolean {
    return !!this.openai;
  }

  private validateProviderConfiguration(): void {
    if (!this.openai) {
      this.initializeOpenAI();
    }
    if (!this.openai) {
      let message = `Cliente OpenAI (${this.provider}) não inicializado. `;
      if (this.provider === 'azure') {
        message += 'Verifique as configurações Azure (Endpoint, API Key, Deployment Name).';
      } else {
        message += 'Verifique a configuração da API Key OpenAI.';
      }
      throw new Error(message);
    }
  }

  /**
   * Realiza uma requisição para a API OpenAI com um prompt de sistema e conteúdo do usuário
   * @param systemPrompt O prompt do sistema que define o comportamento da IA
   * @param userContent O conteúdo enviado pelo usuário
   * @returns A resposta de texto da API
   */
  public async makeRequest(systemPrompt: string, userContent: string): Promise<string> {
    this.validateProviderConfiguration();
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

  /**
   * Realiza uma chamada genérica para chat.
   * @param userMessage A mensagem do usuário.
   * @returns A resposta de texto da API em formato Markdown.
   */
  async chat(userMessage: string): Promise<string> {
    console.log('OpenAIService: Chamando chat (via makeRequest)');
    // Usar um prompt de sistema que solicita respostas em Markdown bem formatado
    const systemPrompt = `
      Você é um assistente de IA útil.
      Formate suas respostas sempre usando Markdown para melhor legibilidade:

      - Use **negrito** para destacar informações importantes
      - Use _itálico_ para ênfase
      - Use \`código inline\` para comandos, variáveis ou pequenos trechos de código
      - Use blocos de código com (\`\`\`) para exemplos mais longos de código, especificando a linguagem
      - Use listas (- item) quando apropriado
      - Use cabeçalhos (## Título) para organizar seções na resposta
      - Use tabelas para dados tabulares quando relevante
      - Use > para citações ou destacar informações importantes

      Se fornecer exemplos de código, certifique-se de que estejam bem formatados, identados e sejam completos.
      Suas respostas devem ser informativas, precisas e bem estruturadas.
    `;
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
