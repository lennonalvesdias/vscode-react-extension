import { OpenAIService } from '../services/OpenAIService';
import { ComponentGenerationRequest } from '../services/CodeGenerationService';
import { getSomaRules, getSomaComponents, getCodeQualityGuidelines } from '../shared/SomaGuidelines';

/**
 * Agente especializado em desenvolvimento frontend com React e TypeScript
 * seguindo as diretrizes do Design System Soma
 */
export class FrontendDeveloperAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Gera o código principal para um componente React, hook, serviço ou página
   * baseado no plano de arquitetura fornecido
   * @param request Detalhes da solicitação
   * @param developmentPlan Plano de arquitetura detalhado
   * @returns Código implementado
   */
  async generateMainCode(request: ComponentGenerationRequest, developmentPlan: string): Promise<string> {
    console.log('FrontendDeveloperAgent: Gerando código frontend...');

    const componentName = request.name.charAt(0).toUpperCase() + request.name.slice(1);

    // Obter as diretrizes do Soma do arquivo compartilhado
    const somaRules = getSomaRules();
    const somaComponents = getSomaComponents();
    const codeQualityGuidelines = getCodeQualityGuidelines();

    const systemPrompt = `
Você é um Desenvolvedor Frontend Sênior especializado em React, TypeScript e no Design System "Soma".
Sua tarefa é implementar um artefato React (${request.type}) chamado "${componentName}" seguindo EXATAMENTE o plano de desenvolvimento fornecido.

${somaRules}

${codeQualityGuidelines}

**IMPORTANTE SOBRE QUALIDADE DO CÓDIGO:**
- O código deve ser livre de erros estáticos/lint
- Declare e use tipos TypeScript apropriados
- Nomeie variáveis e funções de forma clara e semântica
- Implemente validações e tratamento de erros adequados
- Documente o código com comentários JSDoc apenas onde necessário
- Garanta que o código seja acessível (WCAG) seguindo os padrões de acessibilidade
- Evite código complexo ou difícil de manter
- Aplique as melhores práticas de React e frontend modernas

**TECNOLOGIAS FRONTEND:**
- React 18+ com Hooks
- TypeScript com tipagem estrita
- CSS Modules para estilização (quando necessário)
- Design System Soma como biblioteca principal de componentes
- Práticas modernas de responsividade e acessibilidade

**INSTRUÇÃO PARA IMPLEMENTAÇÃO:**
1. Você recebeu um plano detalhado criado por um Arquiteto
2. SIGA O PLANO precisamente, implementando cada requisito especificado
3. Utilize apenas os componentes do Design System Soma conforme indicado no plano
4. O código deve ser completo e funcional
5. Defina todas as interfaces/tipos necessários
6. O código deve estar livre de erros de sintaxe e lógica

**DADOS DA SOLICITAÇÃO:**
- Tipo: ${request.type}
- Nome: ${componentName}
- Descrição: ${request.description}

**FORMATO DE RESPOSTA:**
Forneça apenas o código-fonte sem explicações adicionais. O código deve estar em TypeScript (com extensão .tsx, exceto para hooks e serviços que devem usar .ts).
`;

    // Combine a descrição do usuário com o plano de desenvolvimento
    const userContent = `
# Plano de Desenvolvimento
${developmentPlan}

# Lista de Componentes Soma Disponíveis
${somaComponents}

# Código a Ser Implementado
Implemente o código completo para ${request.type === 'component' ? `o componente` : request.type === 'hook' ? `o hook` : request.type === 'service' ? `o serviço` : `a página`} "${componentName}" seguindo o plano acima.
`;

    try {
      const code = await this.openAIService.generateCode(systemPrompt, userContent);
      console.log('FrontendDeveloperAgent: Código frontend gerado com sucesso');

      // Extrair apenas o código da resposta, removendo explicações
      const codeMatch = code.match(/```(?:tsx?|jsx?)?\s*([\s\S]*?)```/);
      const finalCode = codeMatch ? codeMatch[1].trim() : code;

      return finalCode;
    } catch (error) {
      console.error('FrontendDeveloperAgent: Erro ao gerar código frontend:', error);
      throw error;
    }
  }
}