import * as vscode from 'vscode';
import { OpenAIService } from './OpenAIService';
import { FileService } from './FileService';
import { FrontendDeveloperAgent } from '../agents/FrontendDeveloperAgent';
import { TestAgent } from '../agents/TestAgent';
import { ArchitectureAgent } from '../agents/ArchitectureAgent';
import { PromptClassifierAgent, IntentAnalysisResult } from '../agents/PromptClassifierAgent';

/**
 * Interface para representar uma solicitação de geração de componente React
 */
export interface ComponentGenerationRequest {
  /** Nome do componente a ser gerado */
  name: string;
  /** Tipo de arquivo a ser gerado (component, hook, service, page) */
  type: 'component' | 'hook' | 'service' | 'page';
  /** Caminho onde o arquivo deve ser criado, relativo à raiz do workspace */
  path?: string;
  /** Descrição do que o componente deve fazer */
  description: string;
}

/**
 * Interface para representar um arquivo gerado
 */
export interface GeneratedFile {
  /** Caminho relativo do arquivo */
  path: string;
  /** Conteúdo do arquivo */
  content: string;
}

/**
 * Serviço para geração de código usando a API OpenAI
 */
export class CodeGenerationService {
  private openAIService: OpenAIService;
  private fileService: FileService;
  private frontendDeveloperAgent: FrontendDeveloperAgent;
  private testAgent: TestAgent;
  private architectureAgent: ArchitectureAgent;
  private promptClassifierAgent: PromptClassifierAgent;

  constructor() {
    this.openAIService = new OpenAIService();
    this.fileService = new FileService();
    this.frontendDeveloperAgent = new FrontendDeveloperAgent(this.openAIService);
    this.testAgent = new TestAgent(this.openAIService);
    this.architectureAgent = new ArchitectureAgent(this.openAIService);
    this.promptClassifierAgent = new PromptClassifierAgent(this.openAIService);
  }

  /**
   * Gera um componente React com base nos parâmetros fornecidos
   * @param request Detalhes do componente a ser gerado
   */
  public async generateReactComponent(request: ComponentGenerationRequest): Promise<GeneratedFile[]> {
    if (!this.openAIService.hasApiKey()) {
      throw new Error('Credenciais do provedor LLM não configuradas ou inválidas.');
    }

    if (!request.name) {
      throw new Error('O nome do componente é obrigatório');
    }
    if (!request.type) {
      throw new Error('O tipo do componente é obrigatório');
    }
    if (!request.description) {
      throw new Error('A descrição do componente é obrigatória');
    }

    if (!request.path) {
      request.path = this.getDefaultPath(request.type, request.name);
    }

    // Etapa 1: Criar plano de desenvolvimento pelo ArchitectureAgent
    console.log("Fase 1: Criando plano de desenvolvimento com ArchitectureAgent...");
    const developmentPlan = await this.architectureAgent.createDevelopmentPlan(request);

    // Etapa 2: Gerar código principal baseado no plano do arquiteto
    console.log("Fase 2: Gerando código principal com FrontendDeveloperAgent baseado no plano...");
    let mainCode: string;
    try {
      mainCode = await this.frontendDeveloperAgent.generateMainCode(request, developmentPlan);
    } catch (error) {
      console.error("Erro fatal ao gerar código principal:", error);
      vscode.window.showErrorMessage(`Erro ao gerar código principal: ${error instanceof Error ? error.message : error}`);
      throw error; // Interrompe o fluxo
    }

    // Etapa 3: Gerar testes (pode ser em paralelo)
    console.log("Fase 3: Gerando testes com TestAgent...");
    const testPromise = this.testAgent.generateTests(mainCode, request.description)
      .catch(error => {
        console.error("Erro ao gerar testes (não fatal):", error);
        return "// Falha ao gerar testes automaticamente."; // Placeholder
      });

    const [testCode] = await Promise.all([testPromise]);

    // Etapa 4: Extrair/montar arquivos
    const files = this.extractFiles(mainCode, testCode, developmentPlan, request);

    // Etapa 5: Criar/atualizar arquivos no workspace
    const createdFiles: GeneratedFile[] = [];
    for (const file of files) {
      const exists = await this.fileService.fileExists(file.path);
      if (exists) {
        const overwrite = await vscode.window.showQuickPick(['Sim', 'Não'], {
          placeHolder: `O arquivo ${file.path} já existe. Deseja sobrescrever?`
        });

        if (overwrite === 'Sim') {
          await this.fileService.updateFile(file.path, file.content);
          createdFiles.push(file);
        }
        // Se não sobrescrever, não adiciona a createdFiles
      } else {
        await this.fileService.createFile(file.path, file.content);
        createdFiles.push(file);
      }
    }

    return createdFiles;
  }

  /**
   * Monta a estrutura de arquivos finais com base nos resultados dos agentes.
   * @param mainCode Código principal gerado
   * @param testCode Código de teste gerado
   * @param developmentPlan Plano de desenvolvimento criado pelo arquiteto
   * @param request Detalhes da solicitação original
   */
  private extractFiles(
    mainCode: string,
    testCode: string,
    developmentPlan: string,
    request: ComponentGenerationRequest
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const { type, path: basePath = '', name } = request;
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);

    // Adicionar comentário com o plano de desenvolvimento no início do código principal
    const mainCodeWithPlan = `/*
# Plano de Desenvolvimento
${developmentPlan}
*/

${mainCode}`;

    switch (type) {
      case 'component': {
        const mainFilePath = `${basePath}/${componentName}.tsx`;
        const testFilePath = `${basePath}/${componentName}.test.tsx`;
        const indexFilePath = `${basePath}/index.tsx`;
        const cssFilePath = `${basePath}/${componentName}.module.css`;

        files.push({ path: mainFilePath, content: mainCodeWithPlan });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(componentName, type) });
        files.push({ path: indexFilePath, content: `export { default } from './${componentName}';\n` });
        files.push({ path: cssFilePath, content: `/* Estilos para ${componentName} */\n` });
        break;
      }
      case 'hook': {
        const hookFileName = `use${componentName}`;
        const mainFilePath = `${basePath}/${hookFileName}.ts`;
        const testFilePath = `${basePath}/${hookFileName}.test.ts`;

        files.push({ path: mainFilePath, content: mainCodeWithPlan });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(hookFileName, type) });
        break;
      }
      case 'service': {
        const serviceFileName = `${componentName}Service`;
        const mainFilePath = `${basePath}/${serviceFileName}.ts`;
        const testFilePath = `${basePath}/${serviceFileName}.test.ts`;

        files.push({ path: mainFilePath, content: mainCodeWithPlan });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(serviceFileName, type) });
        break;
      }
      case 'page': {
        const pageFileName = `${componentName}Page`;
        const mainFilePath = `${basePath}/${pageFileName}.tsx`;
        const testFilePath = `${basePath}/${pageFileName}.test.tsx`;
        const indexFilePath = `${basePath}/index.tsx`;
        const cssFilePath = `${basePath}/${pageFileName}.module.css`;

        files.push({ path: mainFilePath, content: mainCodeWithPlan });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(pageFileName, type) });
        files.push({ path: indexFilePath, content: `export { default } from './${pageFileName}';\n` });
        files.push({ path: cssFilePath, content: `/* Estilos para ${pageFileName} */\n` });
        break;
      }
    }

    // Normalizar caminhos
    return files.map(file => ({
      ...file,
      path: file.path.replace(/^\.\//, '')
    }));
  }

  /**
   * Gera um conteúdo básico de teste caso a geração pela IA falhe.
   * @param name Nome do componente/hook/serviço
   * @param type Tipo (component, hook, service, page)
   */
  private generateBasicTest(name: string, type: 'component' | 'hook' | 'service' | 'page'): string {
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);
    switch (type) {
      case 'component':
      case 'page':
        {
          const importName = type === 'page' ? `${componentName}Page` : componentName;
          const importPath = type === 'page' ? `./${importName}` : `./${componentName}`;
          return `import React from 'react';\nimport { render, screen } from '@testing-library/react';\nimport '@testing-library/jest-dom';\nimport ${importName} from '${importPath}';\n\ndescribe('${importName}', () => {\n  it('should render without crashing', () => {\n    render(<${importName} />);\n    // Adicione asserções mais específicas aqui\n    // Exemplo: expect(screen.getByText("Algum Texto")).toBeInTheDocument();\n  });\n});\n`;
        }
      case 'hook':
        {
          const hookName = name.startsWith('use') ? name : `use${componentName}`;
          return `import { renderHook } from '@testing-library/react';
import ${hookName} from './${hookName}';\n\ndescribe('${hookName}', () => {\n  it('should execute without crashing', () => {\n    const { result } = renderHook(() => ${hookName}());\n    // Adicione asserções sobre o estado inicial ou retorno do hook\n    // Exemplo: expect(result.current.someValue).toBe(expectedValue);\n  });\n});\n`;
        }
      case 'service':
        {
          const serviceName = name.endsWith('Service') ? name : `${componentName}Service`;
          return `import ${serviceName} from './${serviceName}';\n\ndescribe('${serviceName}', () => {\n  let service: ${serviceName};\n\n  beforeEach(() => {\n    service = new ${serviceName}();\n  });\n\n  it('should be created', () => {\n    expect(service).toBeTruthy();\n  });\n\n  // Adicione testes para os métodos do serviço aqui\n  // Exemplo:\n  // it('should perform some action', async () => {\n  //   const result = await service.someMethod();\n  //   expect(result).toEqual(expectedResult);\n  // });\n});\n`;
        }
    }
  }

  /**
   * Retorna o caminho padrão para um tipo de componente
   * @param type Tipo do componente
   * @param name Nome do componente
   */
  private getDefaultPath(type: string, name: string): string {
    switch (type) {
      case 'component':
        return `src/components/${name}`;
      case 'hook':
        // Hooks geralmente não ficam em subpastas com o nome
        return `src/hooks`;
      case 'service':
        // Serviços geralmente não ficam em subpastas com o nome
        return `src/services`;
      case 'page':
        return `src/pages/${name}`;
      default:
        // Fallback para outros tipos (menos comum)
        return `src/${type}s/${name}`;
    }
  }

  /**
   * Analisa o conteúdo da mensagem do usuário para determinar se é uma solicitação
   * de geração de código ou uma conversa normal
   * @param message A mensagem do usuário para analisar
   * @returns O resultado da análise
   */
  public async analyzeUserRequest(message: string): Promise<IntentAnalysisResult> {
    return await this.promptClassifierAgent.analyzeUserIntent(message);
  }

  /**
   * Processa um pedido de geração de código baseado na mensagem do usuário
   * @param message A mensagem do usuário com a solicitação de geração
   * @param statusCallback Função de callback opcional para feedback durante o processo
   * @returns Um objeto com o resultado do processamento
   */
  public async processCodeGenerationRequest(
    message: string,
    statusCallback?: (status: string) => void
  ): Promise<{
    success: boolean;
    result?: GeneratedFile[];
    error?: string;
  }> {
    try {
      // Analisar a intenção do usuário
      statusCallback?.('Analisando intenção do seu pedido...');
      const intentResult = await this.analyzeUserRequest(message);

      // Verificar se é uma solicitação de geração de código para frontend
      if (!intentResult.isCodeGeneration) {
        return {
          success: false,
          error: "A mensagem não parece ser uma solicitação de geração de código."
        };
      }

      statusCallback?.('✅ Identificada intenção de gerar código!');

      if (!intentResult.isFrontendDevelopment) {
        return {
          success: false,
          error: "Este assistente é especializado em desenvolvimento frontend. Sua solicitação parece ser para outro tipo de desenvolvimento."
        };
      }

      // Extrair informações do componente a partir da mensagem
      statusCallback?.('Identificando detalhes do artefato a ser gerado...');
      const artifactInfo = this.extractArtifactInfoFromMessage(message);

      if (!artifactInfo) {
        return {
          success: false,
          error: "Não foi possível identificar detalhes suficientes sobre o componente a ser gerado."
        };
      }

      statusCallback?.(`✅ Vou gerar um ${artifactInfo.type} chamado "${artifactInfo.name}"`);

      // Passo 1: Criar plano de arquitetura
      statusCallback?.('🏗️ O arquiteto está planejando a estrutura do código...');
      const developmentPlan = await this.architectureAgent.createDevelopmentPlan({
        name: artifactInfo.name,
        type: artifactInfo.type,
        description: artifactInfo.description,
        path: artifactInfo.path
      });

      statusCallback?.('✅ Plano de arquitetura concluído!');

      // Passo 2: Desenvolver o código baseado no plano
      statusCallback?.('👨‍💻 O desenvolvedor está implementando o código seguindo o plano...');
      const generatedCode = await this.frontendDeveloperAgent.generateMainCode({
        name: artifactInfo.name,
        type: artifactInfo.type,
        description: artifactInfo.description,
        path: artifactInfo.path
      }, developmentPlan);

      statusCallback?.('✅ Implementação do código concluída!');

      // Passo 3: Gerar testes (opcional, em paralelo)
      statusCallback?.('🧪 Gerando testes automatizados...');
      const testCode = await this.testAgent.generateTests(generatedCode, artifactInfo.description)
        .catch(error => {
          console.warn('Erro ao gerar testes (não crítico):', error);
          statusCallback?.('⚠️ Não foi possível gerar testes automatizados.');
          return "// Falha ao gerar testes automaticamente.";
        });

      statusCallback?.('✅ Testes concluídos!');

      // Passo 4: Montar estrutura de arquivos sem incluir o plano no código gerado
      statusCallback?.('📁 Organizando a estrutura de arquivos...');

      // Preparar arquivos sem incluir o plano no código final
      const files: GeneratedFile[] = [];
      const { type, path: basePath = '', name } = artifactInfo;
      const componentName = name.charAt(0).toUpperCase() + name.slice(1);

      switch (type) {
        case 'component': {
          const mainFilePath = `${basePath}/${componentName}.tsx`;
          const testFilePath = `${basePath}/${componentName}.test.tsx`;
          const indexFilePath = `${basePath}/index.tsx`;
          const cssFilePath = `${basePath}/${componentName}.module.css`;

          files.push({ path: mainFilePath, content: generatedCode });
          files.push({ path: testFilePath, content: testCode });
          files.push({ path: indexFilePath, content: `export { default } from './${componentName}';\n` });
          files.push({ path: cssFilePath, content: `/* Estilos para ${componentName} */\n` });
          break;
        }
        case 'hook': {
          const hookFileName = `use${componentName}`;
          const mainFilePath = `${basePath}/${hookFileName}.ts`;
          const testFilePath = `${basePath}/${hookFileName}.test.ts`;

          files.push({ path: mainFilePath, content: generatedCode });
          files.push({ path: testFilePath, content: testCode });
          break;
        }
        case 'service': {
          const serviceFileName = `${componentName}Service`;
          const mainFilePath = `${basePath}/${serviceFileName}.ts`;
          const testFilePath = `${basePath}/${serviceFileName}.test.ts`;

          files.push({ path: mainFilePath, content: generatedCode });
          files.push({ path: testFilePath, content: testCode });
          break;
        }
        case 'page': {
          const pageFileName = `${componentName}Page`;
          const mainFilePath = `${basePath}/${pageFileName}.tsx`;
          const testFilePath = `${basePath}/${pageFileName}.test.tsx`;
          const indexFilePath = `${basePath}/index.tsx`;
          const cssFilePath = `${basePath}/${pageFileName}.module.css`;

          files.push({ path: mainFilePath, content: generatedCode });
          files.push({ path: testFilePath, content: testCode });
          files.push({ path: indexFilePath, content: `export { default } from './${pageFileName}';\n` });
          files.push({ path: cssFilePath, content: `/* Estilos para ${pageFileName} */\n` });
          break;
        }
      }

      // Normalizar caminhos
      const normalizedFiles = files.map(file => ({
        ...file,
        path: file.path.replace(/^\.\//, '')
      }));

      // Passo 5: Criar arquivos no sistema de arquivos
      statusCallback?.('💾 Salvando os arquivos...');
      for (const file of normalizedFiles) {
        const exists = await this.fileService.fileExists(file.path);
        if (exists) {
          statusCallback?.(`⚠️ Arquivo ${file.path} já existe.`);
          // Permitir sobrescrever em caso de arquivo existente
          await this.fileService.updateFile(file.path, file.content);
        } else {
          await this.fileService.createFile(file.path, file.content);
        }
      }

      statusCallback?.('✅ Todos os arquivos foram criados com sucesso!');

      return {
        success: true,
        result: normalizedFiles
      };
    } catch (error) {
      console.error("Erro ao processar pedido de geração de código:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ocorreu um erro ao processar o pedido de geração de código."
      };
    }
  }

  /**
   * Extrai informações sobre o artefato a ser gerado a partir da mensagem do usuário
   * @param message A mensagem do usuário
   * @returns Informações do artefato ou null se não for possível extrair
   */
  private extractArtifactInfoFromMessage(message: string): {
    name: string;
    type: 'component' | 'hook' | 'service' | 'page';
    description: string;
    path?: string;
  } | null {
    try {
      // Normalização básica da mensagem para análise
      const lowerMessage = message.toLowerCase().trim();

      // Identificar tipo de artefato (component, hook, service, page)
      let type: 'component' | 'hook' | 'service' | 'page' = 'component'; // Padrão é componente

      // Termos em português e inglês que indicam uma página/tela
      const pageTerms = ['página', 'page', 'tela', 'screen', 'view', 'interface'];
      const hookTerms = ['hook', 'usestate', 'usereducer', 'useeffect', 'usecontext'];
      const serviceTerms = ['serviço', 'service', 'api', 'client', 'http', 'request'];

      // Verificar por termos específicos que indicam o tipo
      for (const term of pageTerms) {
        if (lowerMessage.includes(term)) {
          type = 'page';
          break;
        }
      }

      // Se não for página, verificar outros tipos
      if (type !== 'page') {
        // Verificar se é hook
        for (const term of hookTerms) {
          if (lowerMessage.includes(term)) {
            type = 'hook';
            break;
          }
        }

        // Verificar se é serviço
        if (type !== 'hook') {
          for (const term of serviceTerms) {
            if (lowerMessage.includes(term)) {
              type = 'service';
              break;
            }
          }
        }
      }

      // Tentar extrair um nome do artefato da mensagem
      let name = '';

      // Mapeamento de funcionalidades comuns para nomes padronizados
      const commonFeatureMap: Record<string, string> = {
        'login': 'Login',
        'cadastro': 'Register',
        'registro': 'Register',
        'autenticação': 'Authentication',
        'autenticacao': 'Authentication',
        'auth': 'Auth',
        'perfil': 'Profile',
        'usuário': 'User',
        'usuario': 'User',
        'dashboard': 'Dashboard',
        'painel': 'Dashboard',
        'produto': 'Product',
        'produtos': 'Product',
        'checkout': 'Checkout',
        'pagamento': 'Payment',
        'carrinho': 'Cart',
        'busca': 'Search',
        'pesquisa': 'Search',
        'configuração': 'Settings',
        'configuracoes': 'Settings',
        'home': 'Home',
        'inicial': 'Home',
        'contato': 'Contact',
        'sobre': 'About'
      };

      // Verificar por padrões comuns para funcionalidades
      for (const [feature, mappedName] of Object.entries(commonFeatureMap)) {
        if (lowerMessage.includes(feature)) {
          name = mappedName;
          break;
        }
      }

      // Se não encontrou nas funcionalidades comuns, tentar padrões mais específicos
      if (!name) {
        // Padrões comuns para identificar nomes em solicitações
        const patterns = [
          // PT-BR patterns
          /(?:criar|gerar|desenvolver|implementar|fazer)\s+(?:um|uma)?\s+(?:componente|página|tela|hook|serviço)\s+(?:de|do|da|para)?\s+(['"]?)([a-zA-Z0-9]+)\1/i,
          /(?:criar|gerar|desenvolver|implementar|fazer)\s+(?:o|a|um|uma)?\s+(['"]?)([a-zA-Z0-9]+)\1\s+(?:componente|página|tela|hook|serviço)/i,
          /(?:página|pagina|tela|screen|view|componente|hook|serviço)\s+(?:de|do|da|para)?\s+(['"]?)([a-zA-Z0-9]+)\1/i,

          // EN patterns
          /(?:create|generate|develop|implement)\s+(?:a|an)?\s+(?:component|page|screen|hook|service)\s+(?:for|of)?\s+(['"]?)([a-zA-Z0-9]+)\1/i,
          /(?:create|generate|develop|implement)\s+(?:a|an)?\s+(['"]?)([a-zA-Z0-9]+)\1\s+(?:component|page|screen|hook|service)/i,
          /(?:page|screen|view|component|hook|service)\s+(?:for|of)?\s+(['"]?)([a-zA-Z0-9]+)\1/i
        ];

        for (const pattern of patterns) {
          const match = message.match(pattern);
          if (match && (match[2])) {
            name = match[2];
            name = name.charAt(0).toUpperCase() + name.slice(1);
            break;
          }
        }
      }

      // Se ainda não encontrou nome, verificar palavras-chave diretas na mensagem
      if (!name) {
        const words = lowerMessage.split(/\s+/);
        for (const word of words) {
          const cleanWord = word.replace(/[^\w]/g, '');
          if (cleanWord.length > 2 && !['crie', 'criar', 'gere', 'gerar', 'uma', 'para', 'novo', 'nova'].includes(cleanWord)) {
            if (commonFeatureMap[cleanWord]) {
              name = commonFeatureMap[cleanWord];
              break;
            }
          }
        }
      }

      // Se não encontrou nome, gerar um padrão baseado no tipo
      if (!name) {
        const typeNames = {
          component: 'NewComponent',
          hook: 'useNewHook',
          service: 'NewService',
          page: 'NewPage'
        };
        name = typeNames[type];
      }

      // Ajustar o caminho com base no tipo
      let path = undefined;
      switch (type) {
        case 'component':
          path = `src/components/${name}`;
          break;
        case 'hook':
          path = 'src/hooks';
          break;
        case 'service':
          path = 'src/services';
          break;
        case 'page':
          path = `src/pages/${name}`;
          break;
      }

      // Descrição é simplesmente a mensagem completa para contexto
      const description = message;

      return { name, type, description, path };
    } catch (error) {
      console.error("Erro ao extrair informações do artefato:", error);
      return null;
    }
  }

  /**
   * Analisa o conteúdo da mensagem do usuário para determinar se é uma solicitação
   * de geração de código ou uma conversa normal
   * @param message A mensagem do usuário para analisar
   * @returns O resultado da análise
   */
  public async analyzeUserIntent(message: string): Promise<IntentAnalysisResult> {
    return await this.promptClassifierAgent.analyzeUserIntent(message);
  }
}
