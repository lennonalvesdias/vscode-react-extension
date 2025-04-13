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
    let prompt = `Aja como um Engenheiro Frontend. Sua tarefa é desenvolver um artefato React (${request.type}) chamado \"${request.name}\" baseado na seguinte descrição: ${request.description}.\n\n    **REGRAS DO DESIGN SYSTEM SOMA (OBRIGATÓRIAS):**\n    - **USE SOMENTE COMPONENTES SOMA:** Utilize exclusivamente componentes do Design System Soma importados de '@soma/react' (Ex: import { SomaButton } from '@soma/react'). A lista de componentes disponíveis está abaixo.\n    - **HTML NATIVO:** Use elementos HTML nativos SOMENTE se não houver um componente Soma adequado. Se usar HTML nativo, estilize-o conforme as regras.\n    - **TIPOGRAFIA SOMA:** Prefira os componentes de tipografia Soma (SomaHeading, SomaSubtitle, SomaParagraph, etc.) em vez de tags HTML como <p>, <h1>, etc.\n    - **ÍCONES SOMA:** Use SEMPRE o componente 'SomaIcon'. Aja como se você tivesse acesso a uma ferramenta 'icon-list' para encontrar o nome exato do ícone necessário.\n    - **ESTILIZAÇÃO:**\n        - Permita apenas redimensionamento (width, height) e posicionamento (margin, padding, top, left, etc.) em componentes Soma.\n        - Use SOMENTE unidades 'px' ou '%'.\n        - Foque em bom espaçamento, uso de cores (do DS implicitamente) e hierarquia visual.\n    - **DOCUMENTAÇÃO DOS COMPONENTES:** Aja como se você tivesse acesso a uma ferramenta 'component-documentation' e a tivesse consultado para entender props e uso de cada componente Soma antes de utilizá-lo.\n    - **EXPORTAÇÃO:** O componente principal gerado deve ser exportado como default.\n    - **QUALIDADE:** Gere código React moderno, limpo, legível e funcional.\n\n    **DESCRIÇÃO DETALHADA DO QUE FAZER:**\n    ${request.description}\n\n    **FOCO PARA O TIPO '${request.type}':**\n    `;

    // Adiciona requisitos específicos do tipo
    switch (request.type) {
      case 'component':
        prompt += `\n- Implemente o componente React com TypeScript.\n- Use CSS Modules para estilização de elementos HTML nativos, se necessário (arquivo ${request.name}.module.css).\n- Inclua PropTypes ou use tipos TypeScript para props.\n- Inclua comentários explicando a funcionalidade principal.\n- Gere um arquivo de teste básico (Jest/React Testing Library) em ${request.name}.test.tsx.\n- Estrutura esperada: index.tsx (export), ${request.name}.tsx (implementação), ${request.name}.module.css (se necessário), ${request.name}.test.tsx.\n`;
        break;
      case 'hook':
        prompt += `\n- Implemente o hook React com TypeScript.\n- Nome do arquivo deve ser use${request.name}.ts.\n- Inclua comentários explicando a funcionalidade.\n- Gere um arquivo de teste básico (Jest/React Testing Library) em use${request.name}.test.ts.\n`;
        break;
      case 'service':
        prompt += `\n- Implemente a classe de serviço com TypeScript.\n- Nome do arquivo deve ser ${request.name}Service.ts.\n- Defina métodos claros e bem tipados.\n- Inclua comentários explicando a funcionalidade.\n- Gere um arquivo de teste básico (Jest) em ${request.name}Service.test.ts.\n`;
        break;
      case 'page':
        prompt += `\n- Implemente a página como um componente funcional React com TypeScript.\n- Use CSS Modules para estilização de elementos HTML nativos, se necessário (arquivo ${request.name}Page.module.css).\n- Estruture a página pensando em layout, responsividade (usando SomaGrid se apropriado) e usabilidade.\n- Gere um arquivo de teste básico (Jest/React Testing Library) em ${request.name}Page.test.tsx.\n- Estrutura esperada: index.tsx (export), ${request.name}Page.tsx (implementação), ${request.name}Page.module.css (se necessário), ${request.name}Page.test.tsx.\n`;
        break;
    }

    // Adiciona a lista de componentes Soma disponíveis
    prompt += `\n    **LISTA DE COMPONENTES SOMA DISPONÍVEIS (@soma/react):**\n    - SomaAccordion, SomaAccordionFooter, SomaAccordionHeader, SomaAccordionItem, SomaAlert, SomaAutocomplete, SomaAutocompleteItem, SomaAvatar, SomaBackdrop, SomaBadge, SomaBanner, SomaBannerItem, SomaButton, SomaButtonLink, SomaCalendar, SomaCalendarDay, SomaCaption, SomaCard, SomaCardActions, SomaCardContent, SomaCardHeader, SomaCardMedia, SomaCardMediaDescription, SomaCheckbox, SomaChip, SomaContainer, SomaContext, SomaDatepicker, SomaDescription, SomaDialog, SomaDialogWarning, SomaDivider, SomaDrawer, SomaDrawerAction, SomaDrawerContent, SomaDrawerHeader, SomaForm, SomaGrid, SomaGridCol, SomaGridRow, SomaHeading, SomaHide, SomaIcon, SomaIconButton, SomaInputBankPassword, SomaLink, SomaList, SomaListItem, SomaListItemAction, SomaMenu, SomaMenuAnchor, SomaMenuItem, SomaModal, SomaOption, SomaPagination, SomaParagraph, SomaPopover, SomaPopoverContent, SomaPopper, SomaPopperContent, SomaProgress, SomaQuantity, SomaRadio, SomaRadioGroup, SomaRating, SomaSearch, SomaSelect, SomaShortcut, SomaSkeleton, SomaSmartForm, SomaSnackbar, SomaSpinner, SomaStepper, SomaStep, SomaSubtitle, SomaSwitch, SomaSwitchText, SomaTab, SomaTable, SomaTableBody, SomaTableCell, SomaTableCollapse, SomaTableHead, SomaTableRow, SomaTabs, SomaTextField, SomaTextarea, SomaTimePicker, SomaTooltip, SomaUpload, SomaUploadDraggable, SomaUploadList, SomaUploadListItem\n    `;

    // Instrução final para o formato de saída JSON, muito simplificado
    prompt += `\n    **FORMATO DE SAÍDA (OBRIGATÓRIO):**\n    Responda APENAS com um JSON válido contendo a chave 'files'. O valor de 'files' deve ser um array de objetos, cada um com 'name' (string, caminho relativo) e 'content' (string, código).\n\n    Exemplo de JSON:\n    {\n      "files": [\n        {\n          "name": "./${request.name}.tsx",\n          "content": "import React from 'react'; ..."\n        },\n        {\n          "name": "./${request.name}.test.tsx",\n          "content": "import React from 'react'; ..."\n        }\n      ]\n    }\n    `;

    return prompt;
  }

  /**
   * Extrai os arquivos do texto gerado pelo OpenAI
   * @param text Texto gerado pelo OpenAI (esperado ser um JSON ou blocos de código)
   * @param type Tipo do componente
   * @param basePath Caminho base para os arquivos
   * @param name Nome do componente
   */
  private extractFiles(text: string, type: string, basePath: string, name: string): GeneratedFile[] {
    try {
      // Tentativa direta de parse JSON, esperando que a OpenAI retorne algo parsable
      // Remover possíveis ```json e ``` do início/fim antes de parsear
      const cleanedText = text.trim().replace(/^```json\s*|\s*```$/g, '');
      const parsedResult = JSON.parse(cleanedText);

      if (parsedResult && Array.isArray(parsedResult.files)) {
        console.log("Resposta JSON válida da OpenAI encontrada e parseada.");
        return parsedResult.files.map((fileData: any) => {
          let filePath = fileData.name;
          if (filePath.startsWith('./')) {
            filePath = filePath.substring(2);
          } else if (filePath.startsWith('/')) {
            filePath = filePath.substring(1);
          }
          const finalPath = filePath.includes('src/') ? filePath : `${basePath}/${filePath}`;
          return {
            path: finalPath.replace(/\\/g, '/'), // Normalizar barras
            content: fileData.content
          };
        }).filter((f: GeneratedFile | null): f is GeneratedFile => f !== null && !!f.path && !!f.content);
      }
    } catch (error) {
      // Não loga erro aqui, pois o fallback é esperado se o parse falhar
    }

    console.warn('Parse direto de JSON falhou ou JSON inválido. Extraindo de blocos de código.');
    return this._extractFilesFromCodeBlocks(text, type, basePath, name);
  }

  /**
   * Fallback: Extrai arquivos de blocos de código Markdown
   */
  private _extractFilesFromCodeBlocks(text: string, type: string, basePath: string, name: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    // Regex aprimorada para capturar nome do arquivo opcional após ```lang(filename.ext)
    const codeBlocks = text.match(/```(?:\w+)?(?:\(?([\w\.\/\-]+\.[jt]sx?|(?:\w+\.)?module\.css)\)?)?\s*\n([\s\S]*?)```/g) || [];
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);

    // Nomes esperados baseados no tipo
    let expectedFiles: { [key: string]: string } = {};
    switch (type) {
      case 'component':
        expectedFiles = {
          [`${componentName}.tsx`]: `${basePath}/${componentName}.tsx`,
          [`${componentName}.module.css`]: `${basePath}/${componentName}.module.css`,
          [`${componentName}.test.tsx`]: `${basePath}/${componentName}.test.tsx`,
          [`index.tsx`]: `${basePath}/index.tsx`,
        };
        break;
      case 'hook':
        expectedFiles = {
          [`use${componentName}.ts`]: `${basePath}/use${componentName}.ts`,
          [`use${componentName}.test.ts`]: `${basePath}/use${componentName}.test.ts`,
        };
        break;
      case 'service':
        expectedFiles = {
          [`${componentName}Service.ts`]: `${basePath}/${componentName}Service.ts`,
          [`${componentName}Service.test.ts`]: `${basePath}/${componentName}Service.test.ts`,
        };
        break;
      case 'page':
        expectedFiles = {
          [`${componentName}Page.tsx`]: `${basePath}/${componentName}Page.tsx`,
          [`${componentName}Page.module.css`]: `${basePath}/${componentName}Page.module.css`,
          [`${componentName}Page.test.tsx`]: `${basePath}/${componentName}Page.test.tsx`,
          [`index.tsx`]: `${basePath}/index.tsx`,
        };
        break;
    }

    codeBlocks.forEach(block => {
      const match = block.match(/```(?:\w+)?(?:\(?([\w\.\/\-]+\.[jt]sx?|(?:\w+\.)?module\.css)\)?)?\s*\n([\s\S]*?)```/);
      if (match && match[2]) { // match[2] é o conteúdo
        const content = match[2].trim();
        const fileName = match[1]; // Nome do arquivo capturado da sintaxe ```lang(filename.ext)
        let filePath: string | null = null;

        if (fileName) {
          // Se o nome foi capturado, tenta encontrar correspondência exata ou parcial
          const foundKey = Object.keys(expectedFiles).find(key => fileName.endsWith(key));
          if (foundKey) {
            filePath = expectedFiles[foundKey];
            delete expectedFiles[foundKey]; // Remove para evitar duplicatas
          }
        } else {
          // Se não capturou nome, tenta adivinhar pelo conteúdo ou tipo
          // Procura por nomes de arquivo esperados dentro do conteúdo
          const foundKey = Object.keys(expectedFiles).find(key => content.includes(key));
          if (foundKey) {
            filePath = expectedFiles[foundKey];
            delete expectedFiles[foundKey];
          }
        }

        // Se ainda não encontrou, mas só sobrou um arquivo esperado, assume que é ele
        if (!filePath && Object.keys(expectedFiles).length === 1) {
          const lastKey = Object.keys(expectedFiles)[0];
          filePath = expectedFiles[lastKey];
          delete expectedFiles[lastKey];
        }

        if (filePath) {
          files.push({ path: filePath, content });
        } else {
          console.warn("Bloco de código encontrado mas não foi possível determinar o nome do arquivo:", content.substring(0, 100));
        }
      }
    });

    // Adiciona arquivos de fallback básicos se ainda faltarem
    Object.entries(expectedFiles).forEach(([key, path]) => {
      console.log(`Gerando fallback básico para arquivo não encontrado: ${key}`);
      if (key.endsWith('.test.tsx') || key.endsWith('.test.ts')) {
        files.push({ path, content: this._generateBasicTestContent(type, componentName) });
      } else if (key.endsWith('index.tsx')) {
        files.push({ path, content: this._generateBasicIndexContent(type, componentName) });
      } else if (key.endsWith('.tsx')) {
        files.push({ path, content: this._generateBasicComponentContent(type, componentName) });
      } else if (key.endsWith('.ts')) { // Hooks ou Services
        files.push({ path, content: this._generateBasicTsContent(type, componentName) });
      } else if (key.endsWith('.module.css')) {
        // Não gera CSS por padrão no fallback, só se for explicitamente pedido
      }
    });
    return files;
  }

  // --- Funções auxiliares para gerar conteúdo básico de fallback ---
  private _generateBasicTestContent(type: string, name: string): string {
    const componentImportName = type === 'page' ? `${name}Page` : type === 'hook' ? `use${name}` : type === 'service' ? `{ ${name}Service }` : name;
    const componentPath = type === 'page' ? `./${name}Page` : type === 'hook' ? `./use${name}` : type === 'service' ? `./${name}Service` : `./${name}`;
    const describeName = type === 'hook' ? `use${name}` : type === 'service' ? `${name}Service` : `${name}${type === 'page' ? 'Page' : ''}`;

    if (type === 'hook') {
      return `import { renderHook } from '@testing-library/react';
import ${componentImportName} from '${componentPath}';

describe('${describeName}', () => {
  it('should work', () => {
    const { result } = renderHook(() => ${componentImportName}());
    expect(result.current).toBeDefined();
  });
});`;
    } else if (type === 'service') {
      return `import ${componentImportName} from '${componentPath}';

describe('${describeName}', () => {
  let service: ${name}Service;
  beforeEach(() => { service = new ${name}Service(); });
  it('should be created', () => { expect(service).toBeTruthy(); });
});`;
    } else { // Component ou Page
      return `import React from 'react';
import { render } from '@testing-library/react';
import ${componentImportName} from '${componentPath}';

describe('${describeName}', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<${componentImportName} />);
    expect(baseElement).toBeTruthy();
  });
});`;
    }
  }

  private _generateBasicIndexContent(type: string, name: string): string {
    const componentImportName = type === 'page' ? `${name}Page` : name;
    const componentPath = type === 'page' ? `./${name}Page` : `./${name}`;
    return `import ${componentImportName} from '${componentPath}';

export default ${componentImportName};`;
  }

  private _generateBasicComponentContent(type: string, name: string): string {
    const componentName = type === 'page' ? `${name}Page` : name;
    return `import React from 'react';
// Importe componentes Soma aqui: import { SomaContainer, SomaHeading } from '@soma/react';
// import styles from './${componentName}.module.css';

${type === 'component' ? `interface ${componentName}Props { /* Props */ }\n` : ''}
const ${componentName}: React.FC<${type === 'component' ? `${componentName}Props` : '{}'}> = (props) => {
  return (
<SomaContainer>\n < SomaHeading variant ="heading-5">${componentName}</SomaHeading>\n      {/* Implementação básica usando Soma */}\n    </SomaContainer>\n  );
};

export default ${componentName};`;
  }

  private _generateBasicTsContent(type: string, name: string): string {
    if (type === 'hook') {
      const hookName = `use${name}`;
      return `import { useState } from 'react';

interface ${hookName}Options { /* Opções */ }
interface ${hookName}Result { /* Resultado */ }

const ${hookName} = (options?: ${hookName}Options): ${hookName}Result => {
  // Implementação básica
  return {};
};

export default ${hookName};`;
    } else { // Service
      const serviceName = `${name}Service`;
      return `export class ${serviceName} {\n  constructor() { /* Inicialização */ }\n  // Métodos do serviço\n}`;
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
