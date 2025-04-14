import { OpenAIService } from '../services/OpenAIService';

export class DesignAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  async analyzeDesign(mainCode: string, description: string): Promise<string> {
    console.log('DesignAgent: Analisando conformidade de design...');

    const systemPrompt = `Você é um especialista no Design System "Soma" e em acessibilidade web (WCAG).
Analise o seguinte código React quanto à conformidade com as regras do Soma DS e melhores práticas de acessibilidade.
Forneça um feedback conciso e acionável em formato de texto simples ou markdown.

Regras Soma DS: [Use componentes @soma/react sempre que possível, siga guias de estilo e acessibilidade.]

Responda com:
1.  **Conformidade Soma:** (Sim/Não/Parcial). Liste violações e sugestões.
2.  **Acessibilidade:** (Boa/Razoável/Ruim). Liste problemas e sugestões.
3.  **Recomendações Gerais:** Outras melhorias.`;

    const userContent = `Descrição da Tarefa: ${description}\n\nCódigo para Análise:\n\`\`\`tsx\n${mainCode}\n\`\`\``;

    try {
      // Chama o método simplificado do OpenAIService
      const analysis = await this.openAIService.analyzeDesignCompliance(systemPrompt, userContent);
      console.log('DesignAgent: Análise de design concluída (string bruta).');
      // Retorna diretamente a string da análise
      return analysis;
    } catch (error) {
      console.error('DesignAgent: Erro ao analisar design:', error);
      return "/* Falha na análise de design pelo DesignAgent. */";
    }
  }
}
