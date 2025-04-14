import { OpenAIService } from '../services/OpenAIService';

export class TestAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  // Método para gerar código de teste
  async generateTests(mainCode: string, description: string): Promise<string> {
    console.log('TestAgent: Gerando testes...');

    // Construir prompt do sistema
    const systemPrompt = `Você é um especialista em testes de software para aplicações React, usando Jest e React Testing Library.
Gere casos de teste unitários/integração para o seguinte componente/hook/serviço React.
Cubra os principais cenários de sucesso, erro e casos limite com base na descrição e no código fornecido.
Use mocks onde for apropriado (ex: chamadas de API, hooks customizados).
Retorne APENAS o código de teste dentro de um único bloco de código markdown (ex: \`\`\`tsx ... \`\`\`).
Não inclua explicações fora do bloco de código.`;

    // Construir conteúdo do usuário
    const userContent = `Descrição da Tarefa: ${description}\n\nCódigo para Testar:\n\`\`\`tsx\n${mainCode}\n\`\`\``;

    try {
      // Chama o método simplificado do OpenAIService
      const testCodeRaw = await this.openAIService.generateTests(systemPrompt, userContent);
      console.log('TestAgent: Testes gerados (string bruta).');

      // Extrai o código do bloco markdown
      const testCodeMatch = testCodeRaw.match(/```(?:tsx?|ts|javascript)?\s*([\s\S]*?)```/);
      const finalTestCode = testCodeMatch ? testCodeMatch[1].trim() : testCodeRaw;

      return finalTestCode;
    } catch (error) {
      console.error('TestAgent: Erro ao gerar testes:', error);
      // Retorna um placeholder indicando a falha
      return "// Falha ao gerar testes automaticamente pelo TestAgent.";
    }
  }
}
