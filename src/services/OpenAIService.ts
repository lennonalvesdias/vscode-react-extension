import * as vscode from 'vscode';
import OpenAI from 'openai';
import { getCompleteSomaGuidelines } from '../shared/SomaGuidelines';
import { getSomaComponentInfo, somaComponentTool } from '../functions/SomaFunction';
import { getSomaIconsList, somaIconsTool } from '../functions/SomaIconsFunction';

// Importar os tipos específicos da OpenAI
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';

// Interface para definir os tools
interface ChatOptions {
  tools?: ChatCompletionTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

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

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    return this.makeCompletions(messages);
  }

  /**
   * Realiza uma chamada genérica para chat.
   * @param userMessage A mensagem do usuário.
   * @param chatHistory Histórico opcional de mensagens anteriores.
   * @param options Opções adicionais para a chamada, incluindo tools.
   * @returns A resposta de texto da API em formato Markdown.
   */
  async chat(
    userMessage: string,
    chatHistory: ChatCompletionMessageParam[] = [],
    options: ChatOptions = {}
  ): Promise<string> {
    console.log('OpenAIService: Chamando chat (via makeRequest)');

    // Incluir diretrizes do Soma no prompt de sistema para garantir que as respostas respeitam o Soma
    const somaGuidelines = getCompleteSomaGuidelines();

    // Usar um prompt de sistema que solicita respostas em Markdown bem formatado
    const systemPrompt = `
      Você é um assistente de IA útil especializado em desenvolvimento React com o Design System Soma.
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

      Quando responder sobre desenvolvimento React ou frontend, considere SEMPRE as seguintes diretrizes do Design System Soma:

      ${somaGuidelines}
    `;

    this.validateProviderConfiguration();
    if (!this.openai) { throw new Error('OpenAI client not available'); }

    console.log('--- OpenAI Request ---');
    console.log('Model:', this.model);
    console.log('System Prompt (preview):', systemPrompt.substring(0, 100) + '...');
    console.log('User Content (preview):', userMessage.substring(0, 100) + '...');
    console.log('Chat History Length:', chatHistory.length);
    console.log('Tools:', options.tools?.length || 0);
    console.log('---------------------');

    // Preparar as mensagens incluindo histórico e a mensagem atual
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Adicionar histórico de mensagens, se existir
    if (chatHistory.length > 0) {
      messages.push(...chatHistory);
    }

    // Adicionar a mensagem atual do usuário
    messages.push({ role: 'user', content: userMessage });

    return this.makeCompletions(messages);
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
   * Realiza uma chamada genérica para geração de testes.
   * @param systemPrompt O prompt do sistema (instruções para a IA).
   * @param userContent O conteúdo do usuário (código para testar, descrição).
   * @returns A resposta de texto da API.
   */
  async generateTests(systemPrompt: string, userContent: string): Promise<string> {
    console.log('OpenAIService: Chamando generateTests (via makeRequest)');
    return this.makeRequest(systemPrompt, userContent);
  }

  /**
   * Realiza a chamada para a API OpenAI com as mensagens fornecidas.
   * @param messages As mensagens a serem enviadas para a API.
   * @returns A resposta da API.
   * @throws Erro se a chamada falhar ou se a resposta não for válida.
   * @private
   * @description Este método é responsável por fazer a chamada real para a API OpenAI.
   * Ele lida com a formatação das mensagens, o tratamento de erros e a lógica de chamadas de ferramentas.
   * Se a resposta da API contiver chamadas de ferramentas, ele processa essas chamadas e faz uma nova requisição
   * para obter a resposta final.
   */
  private async makeCompletions(messages: ChatCompletionMessageParam[]): Promise<string> {
    this.validateProviderConfiguration();

    if (!this.openai) {
      throw new Error('OpenAI client not available');
    }

    try {
      const start = Date.now();

      // Primeira chamada com tools
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: messages,
        tools: [somaComponentTool, somaIconsTool],
      });

      const assistantMessage = completion.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error('Resposta inesperada da API OpenAI.');
      }

      // Adiciona a mensagem do assistente ao histórico
      messages.push(assistantMessage);

      // Se houver tool calls, processa cada uma
      if (assistantMessage.tool_calls?.length) {
        console.log('Tool calls detected:', assistantMessage.tool_calls.length);

        for (const toolCall of assistantMessage.tool_calls) {
          let toolResponse;

          try {
            if (toolCall.function.name === 'getSomaComponent') {
              const args = JSON.parse(toolCall.function.arguments);
              toolResponse = await getSomaComponentInfo({
                componentName: args.componentName,
                variant: args.variant,
                includeExamples: args.includeExamples,
                version: args.version,
              });
            } else if (toolCall.function.name === 'getSomaIcons') {
              toolResponse = await getSomaIconsList();
            }

            // Adiciona a resposta da tool ao histórico
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResponse),
            });
          } catch (error) {
            console.error(`Error executing tool ${toolCall.function.name}:`, error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: `Failed to execute ${toolCall.function.name}` }),
            });
          }
        }

        // Segunda chamada para obter a resposta final com os resultados das tools
        const followUpCompletion = await this.openai.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          messages: messages,
        });

        const finalResult = followUpCompletion.choices[0]?.message?.content;
        if (!finalResult) {
          throw new Error('Resposta inesperada da API OpenAI no follow-up.');
        }

        const duration = Date.now() - start;
        console.log(`OpenAI request took ${duration}ms`);
        return finalResult;
      }

      // Se não houver tool calls, retorna a resposta direta
      const result = assistantMessage.content;
      if (!result) {
        throw new Error('Resposta inesperada da API OpenAI.');
      }

      const duration = Date.now() - start;
      console.log(`OpenAI request took ${duration}ms`);
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
}
