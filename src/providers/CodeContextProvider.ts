import * as vscode from 'vscode';

// create interface for CodeContext return
export interface CodeContext {
  code?: string;
  source?: string;
  language?: string;
  isFrontend: boolean;
  somaVersion: number;
}

/**
 * Obtém o código selecionado pelo usuário ou o conteúdo do arquivo atual
 * @returns Um objeto contendo o contexto e informações sobre a sua origem
 */
export async function getCodeContext(): Promise<CodeContext | null> {
  const isFrontend = await isFrontendWorkspace();
  const somaVersion = await getSomaVersion();

  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    console.log('Nenhum editor ativo encontrado');

    return {
      code: undefined,
      source: undefined,
      language: undefined,
      isFrontend,
      somaVersion,
    };
  }

  // Verificar se há texto selecionado
  const selection = editor.selection;
  const document = editor.document;
  const fileName = document.fileName.split(/[\\/]/).pop() || 'desconhecido';
  const language = document.languageId;

  if (!selection.isEmpty) {
    // Se houver seleção, usa o texto selecionado como contexto
    const selectedText = document.getText(selection);
    if (selectedText.trim().length > 0) {
      console.log(`Contexto obtido: ${selectedText.length} caracteres de código selecionado`);
      return {
        code: selectedText,
        source: `Seleção em ${fileName}`,
        language,
        isFrontend,
        somaVersion,
      };
    }
  }

  // Se não houver seleção ou a seleção estiver vazia, usa o conteúdo do arquivo
  const fileContent = document.getText();
  if (fileContent.trim().length > 0) {
    // Aplicar truncamento inteligente para arquivos grandes (limite de 10K caracteres)
    let truncatedContent = fileContent;
    const maxLength = 10000;

    if (fileContent.length > maxLength) {
      console.log(`Arquivo grande (${fileContent.length} chars), aplicando truncamento`);

      // Tentar identificar a posição do cursor
      const cursorPosition = editor.selection.active;
      const cursorOffset = document.offsetAt(cursorPosition);

      // Extrair a região ao redor do cursor
      const regionStart = Math.max(0, cursorOffset - maxLength / 2);
      const regionEnd = Math.min(fileContent.length, cursorOffset + maxLength / 2);

      truncatedContent = fileContent.substring(regionStart, regionEnd);

      // Adicionar indicadores de truncamento
      if (regionStart > 0) {
        truncatedContent = `/* ... início do arquivo truncado ... */\n${truncatedContent}`;
      }
      if (regionEnd < fileContent.length) {
        truncatedContent = `${truncatedContent}\n/* ... restante do arquivo truncado ... */`;
      }
    }

    console.log(`Contexto obtido: ${truncatedContent.length} caracteres do arquivo ${fileName}`);

    return {
      code: truncatedContent,
      source: `Arquivo ${fileName}`,
      language,
      isFrontend,
      somaVersion,
    };
  }

  return {
    code: undefined,
    source: undefined,
    language: undefined,
    isFrontend,
    somaVersion,
  };
}

/**
 * Verifica se o workspace atual é provavelmente um projeto frontend
 * baseado em arquivos e estrutura de diretórios típicos
 */
export async function isFrontendWorkspace(): Promise<boolean> {
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
      'index.html',
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

      const frontendDependencies = ['react', '@arsenal/react'];

      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
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

    console.log(
      'Não foi possível determinar se o workspace é um projeto frontend. Assumindo que não é.'
    );
    return false;
  } catch (error) {
    console.error('Erro ao verificar o tipo de workspace:', error);
    return true; // Em caso de erro, assumir que é frontend para compatibilidade
  }
}

/**
 * Verifica a version do Design System Soma no workspace atual
 */
export async function getSomaVersion(): Promise<number> {
  try {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      console.log('Sem workspace, assumindo versão mais recente do Soma');
      return 4; // Sem workspace, retornar versão mais recente
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

    try {
      const packageJsonPath = vscode.Uri.file(`${workspaceRoot}/package.json`);
      const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonPath);
      const packageJson = JSON.parse(packageJsonContent.toString());
      const dependencies = packageJson.dependencies || {};

      if (dependencies['@soma/react']) {
        const version = dependencies['@soma/react'];
        console.log(`Versão do Soma detectada: ${version}`);
        const versionMatch = version.match(/^[^0-9]*([0-9]+)\./);
        if (versionMatch) {
          const majorVersion = parseInt(versionMatch[1], 10);
          console.log(`Versão principal do Soma: ${majorVersion}`);
          if (majorVersion <= 3) {
            return 3;
          }
        }
      }

      console.log('Versão do Soma não detectada ou versão mais recente');
      return 4; // Versão mais recente
    } catch (err) {
      console.error('Erro ao ler package.json:', err);
      return 4; // Em caso de erro, retornar versão mais recente
    }
  } catch (error) {
    console.error('Erro ao verificar o tipo de workspace:', error);
    return 4; // Em caso de erro, retornar versão mais recente
  }
}