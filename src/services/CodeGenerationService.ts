import * as vscode from 'vscode';
import { OpenAIService } from './OpenAIService';
import { FileService } from './FileService';
import { AgentContext } from '../agents/types';
import { DeveloperAgent } from '../agents/DeveloperAgent';
import { TestAgent } from '../agents/TestAgent';
import { DesignAgent } from '../agents/DesignAgent';

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
  private developerAgent: DeveloperAgent;
  private testAgent: TestAgent;
  private designAgent: DesignAgent;
  private context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
    this.openAIService = new OpenAIService(context);
    this.fileService = new FileService();

    this.developerAgent = new DeveloperAgent(this.openAIService, context);
    this.testAgent = new TestAgent(this.openAIService, context);
    this.designAgent = new DesignAgent(this.openAIService, context);
  }

  /**
   * Gera um componente React com base nos parâmetros fornecidos
   * @param request Detalhes do componente a ser gerado
   */
  public async generateReactComponent(request: ComponentGenerationRequest): Promise<GeneratedFile[]> {
    // Verificar se a API Key está configurada
    if (!this.openAIService.hasApiKey()) {
      throw new Error('API Key não configurada');
    }

    // Validar a requisição
    if (!request.name) {
      throw new Error('O nome do componente é obrigatório');
    }

    if (!request.type) {
      throw new Error('O tipo do componente é obrigatório');
    }

    if (!request.description) {
      throw new Error('A descrição do componente é obrigatória');
    }

    // Definir caminho padrão se não for fornecido
    if (!request.path) {
      request.path = this.getDefaultPath(request.type, request.name);
    }

    // Etapa 1: Gerar código principal com o DeveloperAgent
    let mainCode: string;
    try {
      mainCode = await this.developerAgent.generateMainCode(request);
    } catch (error) {
      console.error("Erro fatal ao gerar código principal:", error);
      vscode.window.showErrorMessage(`Erro ao gerar código principal: ${error instanceof Error ? error.message : error}`);
      throw error; // Re-lança para interromper o fluxo
    }

    // Etapa 2: Gerar testes com o TestAgent
    // Roda em paralelo com a análise de design para otimizar tempo
    const testPromise = this.testAgent.generateTests(mainCode, request.description)
      .catch(error => {
        console.error("Erro ao gerar testes (não fatal):", error);
        return "// Falha ao gerar testes automaticamente."; // Retorna placeholder em caso de erro
      });

    // Etapa 3: Analisar design com o DesignAgent
    // Roda em paralelo com a geração de testes
    const designAnalysisPromise = this.designAgent.analyzeDesign(mainCode, request.description)
      .catch(error => {
        console.error("Erro ao analisar design (não fatal):", error);
        return "/* Falha na análise de design. */"; // Retorna placeholder em caso de erro
      });

    // Aguarda a conclusão das tarefas paralelas
    const [testCode, designAnalysis] = await Promise.all([testPromise, designAnalysisPromise]);

    // Etapa 4: Extrair/montar arquivos finais com base nos resultados dos agentes
    const files = this.extractFiles(mainCode, testCode, designAnalysis, request);

    // Etapa 5: Criar arquivos no workspace
    const createdFiles: GeneratedFile[] = [];
    for (const file of files) {
      const exists = await this.fileService.fileExists(file.path);
      if (exists) {
        // Se o arquivo já existir, perguntar se deseja sobrescrever
        const overwrite = await vscode.window.showQuickPick(['Sim', 'Não'], {
          placeHolder: `O arquivo ${file.path} já existe. Deseja sobrescrever?`
        });

        if (overwrite === 'Sim') {
          await this.fileService.updateFile(file.path, file.content);
        }
      } else {
        await this.fileService.createFile(file.path, file.content);
      }
      createdFiles.push(file); // Adiciona à lista de arquivos realmente criados/atualizados
    }

    // Retorna apenas os arquivos que foram efetivamente criados ou confirmados para sobrescrita
    return createdFiles;
  }

  /**
   * Extrai os arquivos do texto gerado pelo OpenAI
   * @param mainCode Código principal gerado pelo OpenAI
   * @param testCode Código de teste gerado pelo OpenAI
   * @param designAnalysis Análise de design gerada pelo OpenAI
   * @param request Detalhes do componente
   */
  private extractFiles(
    mainCode: string,
    testCode: string,
    designAnalysis: string,
    request: ComponentGenerationRequest
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const { type, path: basePath = '', name } = request; // Usa request desestruturado
    const componentName = name.charAt(0).toUpperCase() + name.slice(1); // Capitaliza nome

    // Adiciona a análise de design como comentário no início do código principal
    const mainCodeWithAnalysis = `/*\nAnálise de Design e Acessibilidade:\n${designAnalysis}\n*/\n\n${mainCode}`;

    switch (type) {
      case 'component': {
        const mainFilePath = `${basePath}/${componentName}.tsx`;
        const testFilePath = `${basePath}/${componentName}.test.tsx`;
        const indexFilePath = `${basePath}/index.tsx`;
        const cssFilePath = `${basePath}/${componentName}.module.css`;

        // Arquivo Principal (.tsx)
        files.push({ path: mainFilePath, content: mainCodeWithAnalysis });

        // Arquivo de Teste (.test.tsx)
        if (testCode) {
          files.push({ path: testFilePath, content: testCode });
        } else {
          // Gera um teste básico se o agente falhou
          files.push({ path: testFilePath, content: this.generateBasicTest(componentName, type) });
        }

        // Arquivo Index (index.tsx)
        files.push({ path: indexFilePath, content: `export { default } from './${componentName}';\n` });

        // Arquivo CSS Module (.module.css) - Gerar vazio por padrão
        // A lógica de geração pode adicionar estilos aqui se detectar necessidade
        files.push({ path: cssFilePath, content: `/* Estilos para ${componentName} */\n` });
        break;
      }
      case 'hook': {
        const hookFileName = `use${componentName}`;
        const mainFilePath = `${basePath}/${hookFileName}.ts`;
        const testFilePath = `${basePath}/${hookFileName}.test.ts`;

        // Arquivo Principal (.ts) - Análise de design pode ser menos relevante aqui, mas incluímos por consistência
        files.push({ path: mainFilePath, content: `/*\nAnálise:\n${designAnalysis}\n*/\n\n${mainCode}` });

        // Arquivo de Teste (.test.ts)
        if (testCode) {
          files.push({ path: testFilePath, content: testCode });
        } else {
          files.push({ path: testFilePath, content: this.generateBasicTest(hookFileName, type) });
        }
        break;
      }
      case 'service': {
        const serviceFileName = `${componentName}Service`;
        const mainFilePath = `${basePath}/${serviceFileName}.ts`;
        const testFilePath = `${basePath}/${serviceFileName}.test.ts`;

        // Arquivo Principal (.ts)
        files.push({ path: mainFilePath, content: `/*\nAnálise:\n${designAnalysis}\n*/\n\n${mainCode}` });

        // Arquivo de Teste (.test.ts)
        if (testCode) {
          files.push({ path: testFilePath, content: testCode });
        } else {
          files.push({ path: testFilePath, content: this.generateBasicTest(serviceFileName, type) });
        }
        break;
      }
      case 'page': {
        const pageFileName = `${componentName}Page`;
        const mainFilePath = `${basePath}/${pageFileName}.tsx`;
        const testFilePath = `${basePath}/${pageFileName}.test.tsx`;
        const indexFilePath = `${basePath}/index.tsx`;
        const cssFilePath = `${basePath}/${pageFileName}.module.css`;

        // Arquivo Principal (.tsx)
        files.push({ path: mainFilePath, content: mainCodeWithAnalysis });

        // Arquivo de Teste (.test.tsx)
        if (testCode) {
          files.push({ path: testFilePath, content: testCode });
        } else {
          files.push({ path: testFilePath, content: this.generateBasicTest(pageFileName, type) });
        }

        // Arquivo Index (index.tsx)
        files.push({ path: indexFilePath, content: `export { default } from './${pageFileName}';\n` });

        // Arquivo CSS Module (.module.css)
        files.push({ path: cssFilePath, content: `/* Estilos para ${pageFileName} */\n` });
        break;
      }
    }

    // Normalizar caminhos (remover ./)
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
}
