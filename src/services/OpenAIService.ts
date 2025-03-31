import axios from 'axios';
import { AgentContext } from '../agents/types';

export class OpenAIService {
  private apiKey = '';
  private model = 'gpt-3.5-turbo';
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private temperature = 0.7;
  private maxTokens = 2000;
  private timeout = 30000;

  constructor(private context: AgentContext) {
    this.apiKey = context.apiKey || '';
    this.model = context.model || 'gpt-3.5-turbo';
    this.temperature = context.temperature || 0.7;
    this.maxTokens = context.maxTokens || 2000;
    this.timeout = context.timeout || 30000;
  }

  public setApiKey(apiKey: string): void {
    // Importante: esta função apenas define a API key na instância atual do serviço.
    // Para armazenar a API key para todas as instâncias, use ConfigurationService.setApiKey().
    this.apiKey = apiKey;
  }

  public setModel(model: string): void {
    this.model = model;
  }

  public async processChat(message: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key não configurada');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente de desenvolvimento útil e eficiente especializado em React. Forneça respostas concisas, práticas e informativas para ajudar no desenvolvimento.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: this.timeout
        }
      );

      // Extrair e retornar a resposta
      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('Resposta vazia da API');
      }
    } catch (error: unknown) {
      console.error('Erro na chamada da API OpenAI:', error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Erro com resposta do servidor (4xx, 5xx)
          const status = error.response.status;
          const data = error.response.data;

          if (status === 401) {
            throw new Error('API Key inválida. Por favor, verifique sua chave.');
          } else if (status === 429) {
            throw new Error('Limite de requisições excedido. Tente novamente mais tarde.');
          } else {
            throw new Error(`Erro da API (${status}): ${data.error?.message || JSON.stringify(data)}`);
          }
        } else if (error.request) {
          // Erro sem resposta (timeout, etc)
          throw new Error('Tempo limite excedido ou servidor indisponível.');
        } else {
          // Erro de configuração
          throw new Error(`Erro na configuração da requisição: ${error.message}`);
        }
      } else {
        // Erro não relacionado ao axios
        throw new Error(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
  }
}
