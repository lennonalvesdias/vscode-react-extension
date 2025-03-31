import axios from 'axios';
import { AgentContext, AnalysisResult, CodeGenerationResult } from '../agents/types';

export class OpenAIService {
  private apiKey = '';
  private model = 'gpt-3.5-turbo';
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private temperature = 0.7;
  private maxTokens = 2000;
  private timeout = 30000;

  constructor(context: AgentContext) {
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

  private async makeRequest(systemPrompt: string, userPrompt: string): Promise<string> {
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
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
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

  public async processChat(message: string): Promise<string> {
    return this.makeRequest(
      'Você é um assistente de desenvolvimento útil e eficiente especializado em React. Forneça respostas concisas, práticas e informativas para ajudar no desenvolvimento.',
      message
    );
  }

  async analyzeRequest(content: string): Promise<AnalysisResult> {
    try {
      const analysis = await this.makeRequest(
        `Você é um especialista em desenvolvimento React.
        Analise a solicitação do usuário e forneça uma resposta estruturada para ajudar a gerar código.

        Foque em:
        1. Identificar o tipo principal do que está sendo solicitado (page, component, hook, service)
        2. Identificar um nome adequado para o componente principal
        3. Detectar se há componentes relacionados que precisam ser criados (serviços, hooks)
        4. Identificar requisitos funcionais e técnicos importantes
        5. Listar possíveis dependências necessárias

        Forneça sua análise no seguinte formato JSON:
        {
          "type": "page|component|hook|service",
          "name": "NomeSugerido",
          "complexity": "low|medium|high",
          "requirements": ["lista", "de", "requisitos"],
          "dependencies": ["dependência1", "dependência2"],
          "relatedComponents": [
            {"type": "service|hook|component", "name": "NomeRelacionado", "purpose": "descrição"}
          ],
          "risks": ["possível risco 1", "possível risco 2"],
          "recommendations": ["recomendação 1", "recomendação 2"]
        }

        Identifique também:
        - Validações necessárias
        - Estados que precisam ser gerenciados
        - Interações com APIs
        - Armazenamento de dados (localStorage, etc)
        - UI/UX considerações importantes`,
        content
      );

      // Tentar extrair o JSON da resposta
      try {
        const jsonMatch = analysis.match(/```json\s*([\s\S]*?)\s*```/) ||
          analysis.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const jsonStr = jsonMatch[0].replace(/```json|```/g, '').trim();
          const parsedResult = JSON.parse(jsonStr);

          // Converter para o formato AnalysisResult
          return {
            type: parsedResult.type,
            name: parsedResult.name,
            complexity: parsedResult.complexity || 'medium',
            dependencies: parsedResult.dependencies || [],
            risks: parsedResult.risks || [],
            recommendations: parsedResult.recommendations || [],
            // Informações adicionais
            description: content,
            relatedComponents: parsedResult.relatedComponents
          };
        }
      } catch (jsonError) {
        console.error('Erro ao analisar JSON da resposta:', jsonError);
      }

      // Fallback para processamento manual se não conseguir extrair JSON
      return this.parseAnalysis(analysis, content);
    } catch (error) {
      console.error('Erro na análise da solicitação:', error);
      throw error;
    }
  }

  private parseAnalysis(analysis: string, originalRequest: string): AnalysisResult {
    const result: AnalysisResult = {
      complexity: 'medium',
      dependencies: [],
      risks: [],
      recommendations: [],
      description: originalRequest
    };

    // Extrair tipo
    if (analysis.includes('página') || analysis.includes('page')) {
      result.type = 'page';
    } else if (analysis.includes('hook')) {
      result.type = 'hook';
    } else if (analysis.includes('serviço') || analysis.includes('service')) {
      result.type = 'service';
    } else {
      result.type = 'component';
    }

    // Extrair nome
    const nameMatch = analysis.match(/nome[:\s]+([a-zA-Z0-9]+)/i) ||
      analysis.match(/([A-Z][a-zA-Z0-9]+)(Component|Page|Service|Hook)/);

    if (nameMatch) {
      result.name = nameMatch[1];
    } else {
      // Nome padrão baseado no tipo
      switch (result.type) {
        case 'page':
          result.name = 'Page';
          break;
        case 'hook':
          result.name = 'useCustom';
          break;
        case 'service':
          result.name = 'Service';
          break;
        default:
          result.name = 'Component';
      }
    }

    // Extrair complexidade
    if (analysis.includes('complexidade alta') || analysis.includes('high complexity')) {
      result.complexity = 'high';
    } else if (analysis.includes('complexidade baixa') || analysis.includes('low complexity')) {
      result.complexity = 'low';
    }

    // Extrair dependências
    const depMatches = analysis.match(/dependências?:?\s*([\w\s,@-]+)/i);
    if (depMatches) {
      result.dependencies = depMatches[1].split(/,|\n/).map(d => d.trim()).filter(Boolean);
    }

    return result;
  }

  async generateCode(prompt: string): Promise<CodeGenerationResult> {
    try {
      const result = await this.makeRequest(
        'Você é um especialista em desenvolvimento React. Gere código de alta qualidade seguindo as melhores práticas.',
        prompt
      );

      return this.parseCodeGeneration(result);
    } catch (error) {
      console.error('Erro na geração de código:', error);
      throw error;
    }
  }

  async analyzeDesignCompliance(prompt: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em design system. Analise a aderência ao design system e forneça: 1. Recomendações de melhorias 2. Problemas identificados 3. Score de aderência (0-100) 4. Sugestões de componentes do design system a serem utilizados',
      prompt
    );
  }

  async analyzeBusinessAlignment(prompt: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em análise de negócios. Analise o alinhamento do componente com os objetivos do negócio e forneça recomendações, problemas identificados, um score de 0-100 e o valor para o negócio.',
      prompt
    );
  }

  async analyzeArchitecture(prompt: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em arquitetura de software. Analise a consistência arquitetural do componente e forneça recomendações, problemas identificados, um score de 0-100 e os padrões de projeto utilizados.',
      prompt
    );
  }

  async analyzeAccessibility(prompt: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em acessibilidade web. Analise a acessibilidade do componente e forneça recomendações, problemas identificados, um score de 0-100 e sugestões de melhorias.',
      prompt
    );
  }

  async analyzeTestQuality(prompt: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em qualidade de testes. Analise a qualidade dos testes do componente e forneça recomendações, problemas identificados, um score de 0-100 e a cobertura de testes.',
      prompt
    );
  }

  async analyzePerformance(prompt: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em performance de aplicações React. Analise a performance do componente e forneça recomendações, problemas identificados, um score de 0-100 e métricas de performance.',
      prompt
    );
  }

  async analyzeSecurity(code: string): Promise<string> {
    return this.makeRequest(
      'Você é um especialista em segurança de aplicações React. Analise a segurança do componente e forneça recomendações, problemas identificados, um score de 0-100 e vulnerabilidades encontradas.',
      code
    );
  }

  private parseCodeGeneration(result: string): CodeGenerationResult {
    // Implementação simplificada para atender ao tipo de retorno
    return {
      code: result,
      dependencies: [],
      documentation: '',
      tests: []
    };
  }
}
