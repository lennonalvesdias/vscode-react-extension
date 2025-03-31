import * as vscode from 'vscode';
import { OpenAIService } from './OpenAIService';
import { FileService } from './FileService';
import { AgentContext } from '../agents/types';

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

  constructor(context: AgentContext) {
    this.openAIService = new OpenAIService(context);
    this.fileService = new FileService();
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

    // Preparar o prompt para a API OpenAI
    const prompt = this.prepareComponentPrompt(request);

    // Gerar código usando OpenAI
    const response = await this.openAIService.generateCode(prompt);

    // Extrair arquivos do texto gerado
    const files = this.extractFiles(response.code, request.type, request.path, request.name);

    // Criar arquivos no workspace
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
    }

    return files;
  }

  /**
   * Prepara o prompt para a API OpenAI com base no tipo de componente
   * @param request Detalhes do componente a ser gerado
   */
  private prepareComponentPrompt(request: ComponentGenerationRequest): string {
    let prompt = `Gere um ${request.type === 'component' ? 'componente React' :
      request.type === 'hook' ? 'hook React' :
        request.type === 'service' ? 'serviço' :
          'página React'} chamado "${request.name}" com a seguinte descrição: ${request.description}.\n\n`;

    prompt += `Requisitos:\n`;

    switch (request.type) {
      case 'component':
        prompt += `
- Use React com TypeScript
- Use CSS Modules para estilização
- Inclua PropTypes
- Inclua comentários explicando a funcionalidade
- Inclua testes unitários usando Jest e React Testing Library
- Estruture os arquivos da seguinte forma:
  - index.tsx (exportando o componente)
  - ComponentName.tsx (implementação principal)
  - ComponentName.module.css (estilos)
  - ComponentName.test.tsx (testes)
`;
        break;
      case 'hook':
        prompt += `
- Use React com TypeScript
- Inclua comentários explicando a funcionalidade
- Inclua testes unitários usando Jest e React Testing Library
- O nome do arquivo deve seguir o padrão useHookName.ts
- O teste deve seguir o padrão useHookName.test.ts
`;
        break;
      case 'service':
        prompt += `
- Use TypeScript
- Implemente o serviço com métodos bem definidos
- Inclua comentários explicando a funcionalidade
- Inclua testes unitários usando Jest
- O nome do arquivo deve seguir o padrão ServiceName.ts
- O teste deve seguir o padrão ServiceName.test.ts
`;
        break;
      case 'page':
        prompt += `
- Use React com TypeScript
- Use CSS Modules para estilização
- Implemente a página como um componente funcional
- Inclua comentários explicando a funcionalidade
- Inclua testes unitários usando Jest e React Testing Library
- Estruture os arquivos da seguinte forma:
  - index.tsx (exportando a página)
  - PageName.tsx (implementação principal)
  - PageName.module.css (estilos)
  - PageName.test.tsx (testes)
`;
        break;
    }

    prompt += `\nPor favor, forneça o código completo para todos os arquivos necessários. Gere código pronto para uso, moderno e seguindo as melhores práticas.`;

    return prompt;
  }

  /**
   * Extrai os arquivos do texto gerado pelo OpenAI
   * @param text Texto gerado pelo OpenAI
   * @param type Tipo do componente
   * @param basePath Caminho base para os arquivos
   * @param name Nome do componente
   */
  private extractFiles(text: string, type: string, basePath: string, name: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Processar o texto para extrair blocos de código
    const codeBlocks = text.match(/```[\w]*\n([\s\S]*?)```/g) || [];

    switch (type) {
      case 'component': {
        // Para componentes, esperamos index.tsx, ComponentName.tsx, ComponentName.module.css, ComponentName.test.tsx
        const componentName = name.charAt(0).toUpperCase() + name.slice(1);

        // Criar arquivos com base nos blocos de código encontrados
        for (const block of codeBlocks) {
          const content = block.replace(/```[\w]*\n/, '').replace(/```$/, '');

          if (block.includes('index.tsx')) {
            files.push({
              path: `${basePath}/index.tsx`,
              content
            });
          } else if (block.includes(`${componentName}.tsx`)) {
            files.push({
              path: `${basePath}/${componentName}.tsx`,
              content
            });
          } else if (block.includes('.module.css')) {
            files.push({
              path: `${basePath}/${componentName}.module.css`,
              content
            });
          } else if (block.includes('.test.tsx')) {
            files.push({
              path: `${basePath}/${componentName}.test.tsx`,
              content
            });
          }
        }

        // Se não encontrarmos todos os arquivos esperados, criar estruturas básicas
        if (!files.some(f => f.path.endsWith('index.tsx'))) {
          files.push({
            path: `${basePath}/index.tsx`,
            content: `import ${componentName} from './${componentName}';\n\nexport default ${componentName};\n`
          });
        }

        if (!files.some(f => f.path.endsWith(`${componentName}.tsx`))) {
          files.push({
            path: `${basePath}/${componentName}.tsx`,
            content: `import React from 'react';\nimport styles from './${componentName}.module.css';\n\ninterface ${componentName}Props {\n  // Defina as props aqui\n}\n\nconst ${componentName}: React.FC<${componentName}Props> = (props) => {\n  return (\n    <div className={styles.container}>\n      {/* Implementação do componente */}\n    </div>\n  );\n};\n\nexport default ${componentName};\n`
          });
        }

        if (!files.some(f => f.path.endsWith('.module.css'))) {
          files.push({
            path: `${basePath}/${componentName}.module.css`,
            content: `.container {\n  /* Estilos do componente */\n}\n`
          });
        }

        if (!files.some(f => f.path.endsWith('.test.tsx'))) {
          files.push({
            path: `${basePath}/${componentName}.test.tsx`,
            content: `import React from 'react';\nimport { render } from '@testing-library/react';\nimport ${componentName} from './${componentName}';\n\ndescribe('${componentName}', () => {\n  it('should render successfully', () => {\n    const { baseElement } = render(<${componentName} />);\n    expect(baseElement).toBeTruthy();\n  });\n});\n`
          });
        }

        break;
      }

      case 'hook': {
        // Para hooks, esperamos useHookName.ts e useHookName.test.ts
        const hookName = name.charAt(0).toLowerCase() + name.slice(1);
        const fileName = `use${hookName.charAt(0).toUpperCase() + hookName.slice(1)}`;

        for (const block of codeBlocks) {
          const content = block.replace(/```[\w]*\n/, '').replace(/```$/, '');

          if (block.includes(`${fileName}.ts`) && !block.includes('.test.ts')) {
            files.push({
              path: `${basePath}/${fileName}.ts`,
              content
            });
          } else if (block.includes(`${fileName}.test.ts`)) {
            files.push({
              path: `${basePath}/${fileName}.test.ts`,
              content
            });
          }
        }

        // Se não encontrarmos todos os arquivos esperados, criar estruturas básicas
        if (!files.some(f => f.path.endsWith(`${fileName}.ts`))) {
          files.push({
            path: `${basePath}/${fileName}.ts`,
            content: `import { useState, useEffect } from 'react';\n\ninterface ${fileName}Options {\n  // Defina as opções aqui\n}\n\ninterface ${fileName}Result {\n  // Defina o resultado aqui\n}\n\nconst ${fileName} = (options?: ${fileName}Options): ${fileName}Result => {\n  // Implementação do hook\n  \n  return {\n    // Retorne os dados/funções aqui\n  };\n};\n\nexport default ${fileName};\n`
          });
        }

        if (!files.some(f => f.path.endsWith(`${fileName}.test.ts`))) {
          files.push({
            path: `${basePath}/${fileName}.test.ts`,
            content: `import { renderHook, act } from '@testing-library/react';\nimport ${fileName} from './${fileName}';\n\ndescribe('${fileName}', () => {\n  it('should work as expected', () => {\n    const { result } = renderHook(() => ${fileName}());\n    expect(result.current).toBeDefined();\n  });\n});\n`
          });
        }

        break;
      }

      case 'service': {
        // Para serviços, esperamos ServiceName.ts e ServiceName.test.ts
        const serviceName = name.charAt(0).toUpperCase() + name.slice(1) + 'Service';

        for (const block of codeBlocks) {
          const content = block.replace(/```[\w]*\n/, '').replace(/```$/, '');

          if (block.includes(`${serviceName}.ts`) && !block.includes('.test.ts')) {
            files.push({
              path: `${basePath}/${serviceName}.ts`,
              content
            });
          } else if (block.includes(`${serviceName}.test.ts`)) {
            files.push({
              path: `${basePath}/${serviceName}.test.ts`,
              content
            });
          }
        }

        // Se não encontrarmos todos os arquivos esperados, criar estruturas básicas
        if (!files.some(f => f.path.endsWith(`${serviceName}.ts`))) {
          files.push({
            path: `${basePath}/${serviceName}.ts`,
            content: `/**\n * ${serviceName}\n */\nexport class ${serviceName} {\n  /**\n   * Construtor do serviço\n   */\n  constructor() {\n    // Inicialização\n  }\n  \n  // Métodos do serviço\n}\n`
          });
        }

        if (!files.some(f => f.path.endsWith(`${serviceName}.test.ts`))) {
          files.push({
            path: `${basePath}/${serviceName}.test.ts`,
            content: `import { ${serviceName} } from './${serviceName}';\n\ndescribe('${serviceName}', () => {\n  let service: ${serviceName};\n  \n  beforeEach(() => {\n    service = new ${serviceName}();\n  });\n  \n  it('should be created', () => {\n    expect(service).toBeTruthy();\n  });\n});\n`
          });
        }

        break;
      }

      case 'page': {
        // Para páginas, esperamos index.tsx, PageName.tsx, PageName.module.css, PageName.test.tsx
        const pageName = name.charAt(0).toUpperCase() + name.slice(1) + 'Page';

        for (const block of codeBlocks) {
          const content = block.replace(/```[\w]*\n/, '').replace(/```$/, '');

          if (block.includes('index.tsx')) {
            files.push({
              path: `${basePath}/index.tsx`,
              content
            });
          } else if (block.includes(`${pageName}.tsx`)) {
            files.push({
              path: `${basePath}/${pageName}.tsx`,
              content
            });
          } else if (block.includes('.module.css')) {
            files.push({
              path: `${basePath}/${pageName}.module.css`,
              content
            });
          } else if (block.includes('.test.tsx')) {
            files.push({
              path: `${basePath}/${pageName}.test.tsx`,
              content
            });
          }
        }

        // Se não encontrarmos todos os arquivos esperados, criar estruturas básicas
        if (!files.some(f => f.path.endsWith('index.tsx'))) {
          files.push({
            path: `${basePath}/index.tsx`,
            content: `import ${pageName} from './${pageName}';\n\nexport default ${pageName};\n`
          });
        }

        if (!files.some(f => f.path.endsWith(`${pageName}.tsx`))) {
          files.push({
            path: `${basePath}/${pageName}.tsx`,
            content: `import React from 'react';\nimport styles from './${pageName}.module.css';\n\nconst ${pageName}: React.FC = () => {\n  return (\n    <div className={styles.container}>\n      {/* Conteúdo da página */}\n    </div>\n  );\n};\n\nexport default ${pageName};\n`
          });
        }

        if (!files.some(f => f.path.endsWith('.module.css'))) {
          files.push({
            path: `${basePath}/${pageName}.module.css`,
            content: `.container {\n  /* Estilos da página */\n}\n`
          });
        }

        if (!files.some(f => f.path.endsWith('.test.tsx'))) {
          files.push({
            path: `${basePath}/${pageName}.test.tsx`,
            content: `import React from 'react';\nimport { render } from '@testing-library/react';\nimport ${pageName} from './${pageName}';\n\ndescribe('${pageName}', () => {\n  it('should render successfully', () => {\n    const { baseElement } = render(<${pageName} />);\n    expect(baseElement).toBeTruthy();\n  });\n});\n`
          });
        }

        break;
      }
    }

    return files;
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
        return `src/hooks`;
      case 'service':
        return `src/services`;
      case 'page':
        return `src/pages/${name}`;
      default:
        return `src/${type}s`;
    }
  }
}
