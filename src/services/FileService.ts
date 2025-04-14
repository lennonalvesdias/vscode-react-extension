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
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('Nenhum workspace aberto.');
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

      const dirUri = vscode.Uri.joinPath(fileUri, '..');
      await this.ensureDirectoryExists(dirUri);

      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(content);

      await vscode.workspace.fs.writeFile(fileUri, uint8Array);

      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document);

      vscode.window.showInformationMessage(`Arquivo criado: ${filePath}`);
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
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return false;
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

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
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error('Nenhum workspace aberto.');
      }

      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, filePath);

      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(content);

      await vscode.workspace.fs.writeFile(fileUri, uint8Array);

      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document);

      vscode.window.showInformationMessage(`Arquivo atualizado: ${filePath}`);
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
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      await vscode.workspace.fs.createDirectory(dirUri);
    }
  }
}
