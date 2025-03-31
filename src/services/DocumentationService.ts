import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class DocumentationService {
  private readonly DOCS_PATH = path.join(__dirname, '../../docs');

  constructor(private context: vscode.ExtensionContext) {
    this.ensureDocsDirectory();
  }

  private ensureDocsDirectory(): void {
    if (!fs.existsSync(this.DOCS_PATH)) {
      fs.mkdirSync(this.DOCS_PATH, { recursive: true });
    }
  }

  async getFrameworkDocs(): Promise<string> {
    const frameworkPath = path.join(this.DOCS_PATH, 'frameworks.md');
    if (fs.existsSync(frameworkPath)) {
      return fs.readFileSync(frameworkPath, 'utf8');
    }
    return 'Documentação dos frameworks não encontrada.';
  }

  async getDesignSystemDocs(): Promise<string> {
    const designPath = path.join(this.DOCS_PATH, 'design-system.md');
    if (fs.existsSync(designPath)) {
      return fs.readFileSync(designPath, 'utf8');
    }
    return 'Documentação do design system não encontrada.';
  }

  async updateFrameworkDocs(content: string): Promise<void> {
    const frameworkPath = path.join(this.DOCS_PATH, 'frameworks.md');
    fs.writeFileSync(frameworkPath, content);
    vscode.window.showInformationMessage('Documentação dos frameworks atualizada com sucesso!');
  }

  async updateDesignSystemDocs(content: string): Promise<void> {
    const designPath = path.join(this.DOCS_PATH, 'design-system.md');
    fs.writeFileSync(designPath, content);
    vscode.window.showInformationMessage('Documentação do design system atualizada com sucesso!');
  }

  async searchDocs(query: string): Promise<{ framework: string[], design: string[] }> {
    const frameworkDocs = await this.getFrameworkDocs();
    const designDocs = await this.getDesignSystemDocs();

    const frameworkResults = this.searchInContent(frameworkDocs, query);
    const designResults = this.searchInContent(designDocs, query);

    return {
      framework: frameworkResults,
      design: designResults
    };
  }

  private searchInContent(content: string, query: string): string[] {
    const lines = content.split('\n');
    const results: string[] = [];
    const queryLower = query.toLowerCase();

    for (const line of lines) {
      if (line.toLowerCase().includes(queryLower)) {
        results.push(line.trim());
      }
    }

    return results;
  }
}