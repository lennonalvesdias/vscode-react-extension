import * as vscode from 'vscode';
import { OpenAIService } from '../services/OpenAIService';

/**
 * Interface para representar o resultado de análise de intenção
 */
export interface IntentAnalysisResult {
  isCodeGeneration: boolean;
  isFrontendDevelopment: boolean;
  explanation: string;
}

/**
 * Agente especializado em classificar a intenção das mensagens do usuário
 * para determinar se é uma solicitação de geração de código ou conversa normal,
 * e se está relacionada ao desenvolvimento frontend
 */
export class PromptClassifierAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  /**
   * Analisa a intenção da mensagem do usuário e determina se é uma solicitação
   * de geração de código, além de verificar se é relacionada a frontend
   * @param userMessage A mensagem do usuário a ser analisada
   * @returns Um objeto com o resultado da análise
   */
  async analyzeUserIntent(userMessage: string): Promise<IntentAnalysisResult> {
    console.log('PromptClassifierAgent: Analisando intenção do usuário');

    // Verificar o workspace atual para detectar se estamos em um projeto frontend
    const isFrontendWorkspace = await this.isFrontendWorkspace();

    // Prompt específico para classificação de intenção
    const systemPrompt = `
      Você é um assistente especializado em classificar mensagens de usuários em um IDE de programação.
      Sua tarefa é analisar a mensagem do usuário e determinar:

      1. Se é uma solicitação de GERAÇÃO DE CÓDIGO - quando o usuário pede explicitamente para criar, gerar, implementar ou desenvolver um componente, página, serviço, hook, módulo, formulário ou qualquer artefato de código.

      2. Se está relacionada a DESENVOLVIMENTO FRONTEND - quando o usuário menciona tecnologias como React, Vue, Angular, HTML, CSS, UI/UX, componentes visuais, interfaces, páginas web, etc.

      Exemplos de solicitações de GERAÇÃO DE CÓDIGO para FRONTEND:
      - "Crie um componente de botão"
      - "Implemente uma página de login"
      - "Gere um serviço para gerenciar autenticação no React"
      - "Desenvolva um hook personalizado para manipular formulários"
      - "Preciso de um formulário de cadastro responsivo"
      - "Construa uma interface para usuários com o Design System Soma"

      Exemplos de solicitações NÃO relacionadas a frontend:
      - "Crie uma API em Python"
      - "Implemente um microserviço em Java"
      - "Gere um script bash para backup do sistema"
      - "Desenvolva um algoritmo de ordenação eficiente"

      Exemplos de PERGUNTAS ou CONVERSA NORMAL:
      - "Como eu crio um componente React?"
      - "Qual a diferença entre props e state?"
      - "Explique hooks no React"
      - "Qual é a melhor prática para gerenciamento de estado?"
      - "Qual a sintaxe para criar um array em JavaScript?"

      IMPORTANTE: Forneça sua resposta APENAS no formato JSON com as propriedades:
      {
        "isCodeGeneration": true/false,
        "isFrontendDevelopment": true/false,
        "explanation": "Uma breve explicação da sua decisão"
      }
    `;

    try {
      const result = await this.openAIService.makeRequest(systemPrompt, userMessage);
      try {
        // Tentar extrair apenas o JSON da resposta
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : result;
        const analysis = JSON.parse(jsonString);

        // Validar que o resultado tem os campos esperados
        if (typeof analysis.isCodeGeneration !== 'boolean' ||
          typeof analysis.explanation !== 'string') {
          console.error('Formato inválido na resposta da análise de intenção:', analysis);
          // Fallback para comportamento padrão em caso de erro de formato
          return {
            isCodeGeneration: false,
            isFrontendDevelopment: isFrontendWorkspace,
            explanation: "Erro ao analisar a intenção. Tratando como conversa normal."
          };
        }

        // Se o campo isFrontendDevelopment não estiver presente, usar a detecção do workspace
        if (typeof analysis.isFrontendDevelopment !== 'boolean') {
          analysis.isFrontendDevelopment = isFrontendWorkspace;
        }

        return analysis;
      } catch (parseError) {
        console.error('Erro ao analisar resposta JSON:', parseError);
        console.error('Resposta original:', result);
        // Fallback para comportamento padrão em caso de erro de parsing
        return {
          isCodeGeneration: false,
          isFrontendDevelopment: isFrontendWorkspace,
          explanation: "Erro ao analisar a resposta JSON. Tratando como conversa normal."
        };
      }
    } catch (error) {
      console.error('Erro ao analisar intenção do usuário:', error);
      // Fallback para comportamento padrão em caso de erro na API
      return {
        isCodeGeneration: false,
        isFrontendDevelopment: isFrontendWorkspace,
        explanation: "Erro ao consultar serviço de IA. Tratando como conversa normal."
      };
    }
  }

  /**
   * Verifica se o workspace atual é provavelmente um projeto frontend
   * baseado em arquivos e estrutura de diretórios típicos
   */
  private async isFrontendWorkspace(): Promise<boolean> {
    try {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return true; // Sem workspace, assumir que é frontend para compatibilidade
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const frontendIndicators = [
        'package.json',
        'tsconfig.json',
        'webpack.config.js',
        'vite.config.js',
        'angular.json',
        'next.config.js',
        'src/App.tsx',
        'src/App.jsx',
        'src/components',
        'public/index.html',
        'index.html'
      ];

      // Verificar a existência de arquivos típicos de projetos frontend
      for (const indicator of frontendIndicators) {
        try {
          const filePath = vscode.Uri.file(`${workspaceRoot}/${indicator}`);
          await vscode.workspace.fs.stat(filePath);
          console.log(`Indicador de projeto frontend encontrado: ${indicator}`);
          return true;
        } catch (err) {
          // Arquivo não existe, continuar verificando
        }
      }

      // Verificar se há referências a frameworks frontend no package.json
      try {
        const packageJsonPath = vscode.Uri.file(`${workspaceRoot}/package.json`);
        const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonPath);
        const packageJson = JSON.parse(packageJsonContent.toString());

        const frontendDependencies = [
          'react', 'vue', 'angular', 'next', 'nuxt', 'svelte', '@soma/react'
        ];

        const dependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {})
        };

        for (const dep of frontendDependencies) {
          if (Object.keys(dependencies).some(d => d.includes(dep))) {
            console.log(`Dependência frontend encontrada no package.json: ${dep}`);
            return true;
          }
        }
      } catch (err) {
        // Não foi possível ler o package.json
      }

      console.log('Não foi possível determinar se o workspace é um projeto frontend. Assumindo que não é.');
      return false;
    } catch (error) {
      console.error('Erro ao verificar o tipo de workspace:', error);
      return true; // Em caso de erro, assumir que é frontend para compatibilidade
    }
  }
}
