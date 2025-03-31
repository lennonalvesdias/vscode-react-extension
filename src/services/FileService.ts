import * as vscode from 'vscode';

/**
 * Serviço para gerenciar operações de arquivo na geração de código
 */
export class FileService {
  /**
   * Cria um arquivo com o conteúdo especificado
   * @param filePath Caminho relativo ao workspace
   * @param content Conteúdo do arquivo
   */
  public async createFile(filePath: string, content: string): Promise<void> {
    try {
      // Obter o caminho completo
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('Nenhum workspace aberto.');
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

      // Garantir que o diretório existe
      const dirUri = vscode.Uri.joinPath(fileUri, '..');
      await this.ensureDirectoryExists(dirUri);

      // Escrever arquivo usando a API do VS Code
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(content);

      await vscode.workspace.fs.writeFile(fileUri, uint8Array);

      // Abrir o arquivo no editor
      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document);

      vscode.window.showInformationMessage(`Arquivo criado: ${filePath}`);

      return;
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao criar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  }

  /**
   * Verifica se um arquivo existe
   * @param filePath Caminho relativo ao workspace
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      // Obter o caminho completo
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return false;
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

      // Verificar se o arquivo existe
      await vscode.workspace.fs.stat(fileUri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Atualiza o conteúdo de um arquivo existente
   * @param filePath Caminho relativo ao workspace
   * @param content Novo conteúdo
   */
  public async updateFile(filePath: string, content: string): Promise<void> {
    try {
      // Obter o caminho completo
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('Nenhum workspace aberto.');
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

      // Verificar se o arquivo existe
      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Escrever arquivo usando a API do VS Code
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(content);

      await vscode.workspace.fs.writeFile(fileUri, uint8Array);

      // Abrir o arquivo no editor
      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document);

      vscode.window.showInformationMessage(`Arquivo atualizado: ${filePath}`);

      return;
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao atualizar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  }

  /**
   * Garante que um diretório existe, criando-o se necessário
   * @param dirUri URI do diretório
   */
  private async ensureDirectoryExists(dirUri: vscode.Uri): Promise<void> {
    try {
      // Tenta obter as informações do diretório
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      // Se não existir, cria o diretório
      await vscode.workspace.fs.createDirectory(dirUri);
    }
  }

  /**
   * Lê o conteúdo de um arquivo
   * @param filePath Caminho relativo ao workspace
   */
  public async readFile(filePath: string): Promise<string> {
    try {
      // Obter o caminho completo
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('Nenhum workspace aberto.');
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

      // Ler o arquivo usando a API do VS Code
      const uint8Array = await vscode.workspace.fs.readFile(fileUri);
      const decoder = new TextDecoder();
      return decoder.decode(uint8Array);
    } catch (error) {
      vscode.window.showErrorMessage(`Erro ao ler arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  }
}
