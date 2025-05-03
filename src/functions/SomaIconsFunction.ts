import data from '../shared/SomaIcons.json';
import { ChatCompletionTool } from 'openai/resources';

export async function getSomaIconsList(): Promise<string> {
  console.log('getSomaIconsList called');
  return data.icons.map(x => `- ${x}`).join('\n');
}

// Definição da ferramenta para ChatCompletions
export const somaIconsTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'getSomaIcons',
    description: 'Obter uma lista de todos os ícones disponíveis no Soma Design System',
  },
};