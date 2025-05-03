/* eslint-disable @typescript-eslint/no-explicit-any */
import docsV3 from '../shared/SomaDocsV3.json';
import docsV4 from '../shared/SomaDocsV4.json';
import { cammelToPascal, pascalToDash } from '../utils/name-convention';
import { ChatCompletionTool } from 'openai/resources';

// Interface para a estrutura do JSON de documentação
interface SomaComponentEvents {
  event: string;
  detail: any;
  docs?: string;
}

interface SomaComponentProps {
  name: string;
  required: boolean;
  type: string;
  docs?: string;
  default?: string;
}

export interface SomaComponent {
  tag: string;
  props: Array<SomaComponentProps>;
  events: Array<SomaComponentEvents>;
}

// Interface para a implementação da função
export interface SomaComponentArgs {
  componentName: string;
  variant?: string;
  includeExamples?: boolean;
  version?: 3 | 4;
}

export async function getSomaComponentInfo(args: SomaComponentArgs): Promise<string> {
  console.log('getSomaComponentInfo called with args:', args);
  const { componentName, variant, includeExamples = true, version } = args;

  try {
    const docs = version === 3 ? docsV3 : docsV4;

    const component = (docs.components as SomaComponent[]).find((x: SomaComponent) =>
      [pascalToDash(componentName), componentName].includes(x.tag)
    );

    if (!component) {
      return `Componente ${componentName} não encontrado na versão ${version} do Soma Design System.`;
    }

    const attrs = component.props.map((x: SomaComponentProps) => ({
      name: x.name,
      required: x.required,
      type: x.type,
      description: x.docs,
      default: 'default' in x ? x.default || 'undefined' : 'undefined',
    }));

    const events = component.events.map((x: SomaComponentEvents) => ({
      name: `on${cammelToPascal(x.event)}`,
      required: false,
      type: `(event: CustomEvent<${x.detail}>) => void`,
      description: x.docs,
      default: 'null',
    }));

    const properties = [...attrs, ...events];

    // Filtrar propriedades pela variante se especificada
    const filteredProperties = variant
      ? properties.filter(
        prop => prop.name === 'variant' || !prop.name.toLowerCase().includes('variant')
      )
      : properties;

    // Markdown table for properties
    const propertiesHeader =
      '| Name | Type | Required | Default | Description |\n| --- | --- | --- | --- | --- |\n';
    const propertiesList = filteredProperties
      .map(
        x =>
          `| ${x.name} | ${x.type} | ${x.required ? 'Yes' : 'No'} | ${x.default || '-'} | ${x.description || '-'
          } |`
      )
      .join('\n');

    // Exemplo de código se solicitado
    let exampleCode = '';
    if (includeExamples) {
      exampleCode = `\n\n## Example\n\n\`\`\`jsx
        import React from 'react';
        import { ${componentName} } from '@soma/react';

        export const ${componentName}Example = () => {
          return (
            <${componentName}${variant ? ` variant="${variant}"` : ''}${component.props.some((p: { name: string }) => p.name === 'label')
          ? ' label="Example Label"'
          : ''
        }>
              ${['Button', 'Link'].includes(componentName) ? 'Click me' : ''}
            </${componentName}>
          );
        };
      \`\`\``;
    }

    return `# ${componentName}${variant ? ` (${variant})` : ''
      }\n\n## Properties\n\n${propertiesHeader}${propertiesList}${exampleCode}`;
  } catch (error) {
    console.error(`Erro ao buscar informações do componente ${componentName}`, error);
    return `Erro ao buscar informações do componente ${componentName}: ${error instanceof Error ? error.message : 'Erro desconhecido'
      }`;
  }
}

// Definição da ferramenta para ChatCompletions
export const somaComponentTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'getSomaComponent',
    description:
      'Obter informações sobre um componente do Soma Design System, incluindo uso, propriedades e exemplos',
    parameters: {
      type: 'object',
      properties: {
        componentName: {
          type: 'string',
          description: 'O nome do componente do Soma (ex.: Button, Card, TextField)',
        },
        variant: {
          type: 'string',
          description: 'Variante opcional do componente',
          enum: ['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'success'],
        },
        includeExamples: {
          type: 'boolean',
          description: 'Indica se exemplos de código devem ser incluídos na resposta',
          default: true,
        },
        version: {
          type: 'number',
          description: 'Versão do Soma Design System (3 ou 4)',
          enum: [3, 4],
        },
      },
      required: ['componentName'],
    },
  },
};