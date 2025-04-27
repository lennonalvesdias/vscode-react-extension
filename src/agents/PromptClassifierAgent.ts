import { OpenAIService } from '../services/OpenAIService';

/**
 * Interface para representar o resultado de análise de intenção
 */
export interface IntentAnalysisResult {
  isCodeGeneration: boolean;
  explanation: string;
}

/**
 * Agente especializado em classificar a intenção das mensagens do usuário
 * para determinar se é uma solicitação de geração de código ou conversa normal
 */
export class PromptClassifierAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Analisa a intenção da mensagem do usuário e determina se é uma solicitação de geração de código
   * @param userMessage A mensagem do usuário a ser analisada
   * @returns Um objeto com o resultado da análise
   */
  async analyzeUserIntent(userMessage: string): Promise<IntentAnalysisResult> {
    console.log('PromptClassifierAgent: Analisando intenção do usuário');

    // Prompt específico para classificação de intenção
    const systemPrompt = `
      Você é um assistente especializado em classificar mensagens de usuários em um IDE de programação.
      Sua tarefa é analisar a mensagem do usuário e determinar se ela é:

      1. Uma solicitação de GERAÇÃO DE CÓDIGO - quando o usuário pede explicitamente para criar, gerar, implementar ou desenvolver um componente, página, serviço, hook, módulo, formulário ou qualquer artefato de código.

      2. Uma PERGUNTA ou CONVERSA NORMAL - quando o usuário está fazendo perguntas sobre programação, pedindo explicações, conversando, ou solicitando qualquer coisa que não seja geração direta de código.

      Exemplos de solicitações de GERAÇÃO DE CÓDIGO:
      - "Crie um componente de botão"
      - "Implemente uma página de login"
      - "Gere um serviço para gerenciar autenticação"
      - "Desenvolva um hook personalizado para manipular formulários"
      - "Preciso de um formulário de cadastro"
      - "Construa uma interface para usuários"

      Exemplos de PERGUNTAS ou CONVERSA NORMAL:
      - "Como eu crio um componente React?"
      - "Qual a diferença entre props e state?"
      - "Explique hooks no React"
      - "Qual é a melhor prática para gerenciamento de estado?"
      - "Qual a sintaxe para criar um array em JavaScript?"

      IMPORTANTE: Forneça sua resposta APENAS no formato JSON com as propriedades:
      {
        "isCodeGeneration": true/false,
        "explanation": "Uma breve explicação da sua decisão"
      }
    `;

    try {
      const result = await this.openAIService.makeRequest(systemPrompt, userMessage);
      try {
        // Tentar extrair apenas o JSON da resposta
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : result;
        const analysis = JSON.parse(jsonString);

        // Validar que o resultado tem os campos esperados
        if (typeof analysis.isCodeGeneration !== 'boolean' || typeof analysis.explanation !== 'string') {
          console.error('Formato inválido na resposta da análise de intenção:', analysis);
          // Fallback para comportamento padrão em caso de erro de formato
          return {
            isCodeGeneration: false,
            explanation: "Erro ao analisar a intenção. Tratando como conversa normal."
          };
        }

        return analysis;
      } catch (parseError) {
        console.error('Erro ao analisar resposta JSON:', parseError);
        console.error('Resposta original:', result);
        // Fallback para comportamento padrão em caso de erro de parsing
        return {
          isCodeGeneration: false,
          explanation: "Erro ao analisar a resposta JSON. Tratando como conversa normal."
        };
      }
    } catch (error) {
      console.error('Erro ao analisar intenção do usuário:', error);
      // Fallback para comportamento padrão em caso de erro na API
      return {
        isCodeGeneration: false,
        explanation: "Erro ao consultar serviço de IA. Tratando como conversa normal."
      };
    }
  }
}
