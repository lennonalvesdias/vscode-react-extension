import * as vscode from 'vscode';
import { OpenAIService } from './OpenAIService';
import { FileService } from './FileService';
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

  constructor() {
    this.openAIService = new OpenAIService();
    this.fileService = new FileService();
    this.developerAgent = new DeveloperAgent(this.openAIService);
    this.testAgent = new TestAgent(this.openAIService);
    this.designAgent = new DesignAgent(this.openAIService);
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

    // Etapa 1: Gerar código principal
    let mainCode: string;
    try {
      mainCode = await this.developerAgent.generateMainCode(request);
    } catch (error) {
      console.error("Erro fatal ao gerar código principal:", error);
      vscode.window.showErrorMessage(`Erro ao gerar código principal: ${error instanceof Error ? error.message : error}`);
      throw error; // Interrompe o fluxo
    }

    // Etapa 2 e 3: Gerar testes e análise de design (paralelo)
    const testPromise = this.testAgent.generateTests(mainCode, request.description)
      .catch(error => {
        console.error("Erro ao gerar testes (não fatal):", error);
        return "// Falha ao gerar testes automaticamente."; // Placeholder
      });

    const designAnalysisPromise = this.designAgent.analyzeDesign(mainCode, request.description)
      .catch(error => {
        console.error("Erro ao analisar design (não fatal):", error);
        return "/* Falha na análise de design. */"; // Placeholder
      });

    const [testCode, designAnalysis] = await Promise.all([testPromise, designAnalysisPromise]);

    // Etapa 4: Extrair/montar arquivos
    const files = this.extractFiles(mainCode, testCode, designAnalysis, request);

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
   * @param designAnalysis Análise de design gerada
   * @param request Detalhes da solicitação original
   */
  private extractFiles(
    mainCode: string,
    testCode: string,
    designAnalysis: string,
    request: ComponentGenerationRequest
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const { type, path: basePath = '', name } = request;
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);

    const mainCodeWithAnalysis = `/*\nAnálise de Design e Acessibilidade:\n${designAnalysis}\n*/\n\n${mainCode}`;

    switch (type) {
      case 'component': {
        const mainFilePath = `${basePath}/${componentName}.tsx`;
        const testFilePath = `${basePath}/${componentName}.test.tsx`;
        const indexFilePath = `${basePath}/index.tsx`;
        const cssFilePath = `${basePath}/${componentName}.module.css`;

        files.push({ path: mainFilePath, content: mainCodeWithAnalysis });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(componentName, type) });
        files.push({ path: indexFilePath, content: `export { default } from './${componentName}';\n` });
        files.push({ path: cssFilePath, content: `/* Estilos para ${componentName} */\n` });
        break;
      }
      case 'hook': {
        const hookFileName = `use${componentName}`;
        const mainFilePath = `${basePath}/${hookFileName}.ts`;
        const testFilePath = `${basePath}/${hookFileName}.test.ts`;
        const hookCodeWithAnalysis = `/*\nAnálise:\n${designAnalysis}\n*/\n\n${mainCode}`;

        files.push({ path: mainFilePath, content: hookCodeWithAnalysis });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(hookFileName, type) });
        break;
      }
      case 'service': {
        const serviceFileName = `${componentName}Service`;
        const mainFilePath = `${basePath}/${serviceFileName}.ts`;
        const testFilePath = `${basePath}/${serviceFileName}.test.ts`;
        const serviceCodeWithAnalysis = `/*\nAnálise:\n${designAnalysis}\n*/\n\n${mainCode}`;

        files.push({ path: mainFilePath, content: serviceCodeWithAnalysis });
        files.push({ path: testFilePath, content: testCode || this.generateBasicTest(serviceFileName, type) });
        break;
      }
      case 'page': {
        const pageFileName = `${componentName}Page`;
        const mainFilePath = `${basePath}/${pageFileName}.tsx`;
        const testFilePath = `${basePath}/${pageFileName}.test.tsx`;
        const indexFilePath = `${basePath}/index.tsx`;
        const cssFilePath = `${basePath}/${pageFileName}.module.css`;

        files.push({ path: mainFilePath, content: mainCodeWithAnalysis });
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
}
