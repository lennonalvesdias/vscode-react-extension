import { OpenAIService } from '../services/OpenAIService';
import { ComponentGenerationRequest } from '../services/CodeGenerationService';
import { getCompleteSomaGuidelines } from '../shared/SomaGuidelines';

/**
 * Interface para representar o resultado do planejamento do arquiteto
 */
export interface DevelopmentPlan {
  steps: string[];
  componentStructure: string;
  dataStructure: string;
  stateManagement: string;
  additionalNotes: string;
}

/**
 * Agente responsável por planejar a arquitetura e estrutura do código a ser gerado
 * Este agente define o passo a passo do desenvolvimento que o FrontendDeveloperAgent seguirá
 */
export class ArchitectureAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Gera um plano de desenvolvimento detalhado para o componente/serviço/hook/página solicitado
   * @param request - Detalhes da solicitação do componente
   * @returns Plano detalhado de desenvolvimento
   */
  async createDevelopmentPlan(request: ComponentGenerationRequest): Promise<string> {
    console.log('ArchitectureAgent: Criando plano de desenvolvimento...');

    const componentName = request.name.charAt(0).toUpperCase() + request.name.slice(1);
    const somaGuidelines = getCompleteSomaGuidelines();

    const systemPrompt = `
Você é um arquiteto de software sênior especializado em React, TypeScript e no Design System "Soma".
Sua tarefa é criar um plano detalhado de desenvolvimento para um artefato React que seguirá as diretrizes do Soma.

Com base na descrição fornecida, você deve planejar a ARQUITETURA e ESTRUTURA do código a ser gerado, considerando:
1. HIERARQUIA de componentes e suas responsabilidades
2. INTERFACES e TIPOS de TypeScript necessários
3. GERENCIAMENTO DE ESTADO (local com useState, useReducer, ou global se necessário)
4. MANIPULAÇÃO de EVENTOS e EFEITOS COLATERAIS
5. PADRÕES de DESIGN a serem aplicados
6. ESTRATÉGIAS para garantir PERFORMANCE e ACESSIBILIDADE
7. CONSIDERAÇÕES ESPECÍFICAS para o tipo de artefato (${request.type})

${somaGuidelines}

Você deve gerar um plano de desenvolvimento DETALHADO e ESTRUTURADO que servirá como guia para o desenvolvedor implementar o código.
Seja ESPECÍFICO sobre quais componentes Soma devem ser utilizados e como eles devem ser organizados.
NÃO escreva código completo, apenas descreva a estrutura, lógica e fluxo.

Formate sua resposta em markdown com seções claras (use headers, listas e destaques) para facilitar a leitura.
`;

    const userContent = `
# Solicitação de Desenvolvimento
- **Tipo de Artefato:** ${request.type}
- **Nome:** ${componentName}
- **Descrição:** ${request.description}
`;

    try {
      const plan = await this.openAIService.makeRequest(systemPrompt, userContent);
      console.log('ArchitectureAgent: Plano de desenvolvimento criado com sucesso');
      return plan;
    } catch (error) {
      console.error('ArchitectureAgent: Erro ao criar plano de desenvolvimento:', error);
      return `# Plano de Desenvolvimento Básico para ${componentName}

Não foi possível gerar um plano detalhado devido a um erro. Considere as seguintes diretrizes básicas:

1. Criar estrutura básica do ${request.type}
2. Implementar funcionalidades principais
3. Adicionar tipagem TypeScript
4. Utilizar componentes do Soma Design System
5. Seguir boas práticas de React`;
    }
  }
}
