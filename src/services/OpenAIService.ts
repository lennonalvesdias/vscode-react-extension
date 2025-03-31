import OpenAI from 'openai';
import { AgentContext } from '../agents/types';

interface AnalysisResult {
  componentType: 'page' | 'component' | 'hook' | 'service';
  requirements: string[];
  dependencies: string[];
  suggestedName: string;
  description: string;
}

interface CodeGenerationResult {
  code: string;
  tests: string;
  documentation: string;
}

export class OpenAIService {
  private openai: OpenAI;

  constructor(private context: AgentContext) {
    const apiKey = context.globalState.get<string>('psCopilot.openaiApiKey');
    if (!apiKey) {
      throw new Error('API Key não configurada');
    }

    this.openai = new OpenAI({ apiKey });
  }

  async analyzeRequest(content: string): Promise<AnalysisResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em desenvolvimento React. Analise a solicitação e forneça: 1. Tipo de componente (page, component, hook, service) 2. Requisitos técnicos 3. Dependências necessárias 4. Nome sugerido 5. Descrição detalhada'
          },
          {
            role: 'user',
            content: content
          }
        ]
      });

      const analysis = response.choices[0].message.content || '';
      return this.parseAnalysis(analysis);
    } catch (error) {
      console.error('Erro na análise da solicitação:', error);
      throw error;
    }
  }

  async generateCode(prompt: string): Promise<CodeGenerationResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em desenvolvimento React. Gere código de alta qualidade seguindo as melhores práticas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const result = response.choices[0].message.content || '';
      return this.parseCodeGeneration(result);
    } catch (error) {
      console.error('Erro na geração de código:', error);
      throw error;
    }
  }

  async analyzeDesignCompliance(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em design system. Analise a aderência ao design system e forneça: 1. Recomendações de melhorias 2. Problemas identificados 3. Score de aderência (0-100) 4. Sugestões de componentes do design system a serem utilizados'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content || 'Não foi possível analisar o design';
    } catch (error) {
      console.error('Erro na análise de design:', error);
      throw error;
    }
  }

  async analyzeBusinessAlignment(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de negócios. Analise o alinhamento do componente com os objetivos do negócio e forneça recomendações, problemas identificados, um score de 0-100 e o valor para o negócio.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na análise de negócio:', error);
      throw error;
    }
  }

  async analyzeArchitecture(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em arquitetura de software. Analise a consistência arquitetural do componente e forneça recomendações, problemas identificados, um score de 0-100 e os padrões de projeto utilizados.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na análise arquitetural:', error);
      throw error;
    }
  }

  async analyzeAccessibility(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em acessibilidade web. Analise a acessibilidade do componente e forneça recomendações, problemas identificados, um score de 0-100 e sugestões de melhorias.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na análise de acessibilidade:', error);
      throw error;
    }
  }

  async analyzeTestQuality(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em qualidade de testes. Analise a qualidade dos testes do componente e forneça recomendações, problemas identificados, um score de 0-100 e a cobertura de testes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na análise de qualidade dos testes:', error);
      throw error;
    }
  }

  async analyzePerformance(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em performance de aplicações React. Analise a performance do componente e forneça recomendações, problemas identificados, um score de 0-100 e métricas de performance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na análise de performance:', error);
      throw error;
    }
  }

  async analyzeSecurity(code: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em segurança de aplicações React. Analise a segurança do componente e forneça recomendações, problemas identificados, um score de 0-100 e vulnerabilidades encontradas.'
          },
          {
            role: 'user',
            content: code
          }
        ]
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Erro na análise de segurança:', error);
      throw error;
    }
  }

  private parseAnalysis(analysis: string): AnalysisResult {
    // Implementação do parsing da análise
    return {
      componentType: 'component',
      requirements: [],
      dependencies: [],
      suggestedName: '',
      description: ''
    };
  }

  private parseCodeGeneration(result: string): CodeGenerationResult {
    // Implementação do parsing da geração de código
    return {
      code: '',
      tests: '',
      documentation: ''
    };
  }
}
