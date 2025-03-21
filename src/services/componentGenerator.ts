import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIService } from './openAIService';
import { DesignAgent } from '../agents/designAgent';
import { DevAgent } from '../agents/devAgent';

export interface GeneratorOptions {
    workspaceRoot: string;
    openAIService: OpenAIService;
}

export interface GenerateComponentOptions {
    request: string;
    showSuccessMessage?: boolean;
    onProgress?: (message: string) => void;
}

export class ComponentGenerator {
    private readonly designAgent: DesignAgent;
    private readonly devAgent: DevAgent;
    private readonly workspaceRoot: string;

    constructor(options: GeneratorOptions) {
        if (!options.workspaceRoot) {
            throw new Error('workspaceRoot é obrigatório');
        }
        
        if (!fs.existsSync(options.workspaceRoot)) {
            throw new Error(`Diretório do workspace não encontrado: ${options.workspaceRoot}`);
        }

        this.workspaceRoot = options.workspaceRoot;
        this.designAgent = new DesignAgent(options.openAIService);
        this.devAgent = new DevAgent(options.openAIService);

        console.log(`ComponentGenerator inicializado com workspace: ${this.workspaceRoot}`);
    }

    async generateComponent(options: GenerateComponentOptions): Promise<void> {
        const { request, showSuccessMessage = true, onProgress } = options;

        try {
            console.log('Iniciando geração de componente para:', request);
            
            // Notifica progresso
            onProgress?.('Analisando requisitos e criando especificações...');

            // Usa o DesignAgent para criar as especificações
            const designResponse = await this.designAgent.analyzeRequirements(request);
            if (!designResponse.success) {
                throw new Error(designResponse.error || 'Falha ao gerar especificações do componente');
            }

            console.log('Especificações geradas:', designResponse.content);

            // Converte a resposta em especificações
            const specs = JSON.parse(designResponse.content);

            // Notifica progresso
            onProgress?.('Gerando implementação do componente...');

            // Usa o DevAgent para gerar o código baseado nas especificações
            const devResponse = await this.devAgent.generateCode(specs);
            if (!devResponse.success) {
                throw new Error(devResponse.error || 'Falha ao gerar código do componente');
            }

            console.log('Código gerado:', devResponse.content);

            // Notifica progresso
            onProgress?.('Criando estrutura de arquivos...');

            // Cria a estrutura de pastas necessária
            await this.createDirectoryStructure();

            // Notifica progresso
            onProgress?.('Salvando arquivos gerados...');

            // Salva os arquivos
            const files = this.parseGeneratedCode(devResponse.content);
            
            if (Object.keys(files).length === 0) {
                throw new Error('Nenhum arquivo foi gerado pelo código');
            }

            console.log('Arquivos a serem criados:', Object.keys(files));
            await this.saveGeneratedFiles(files);

            // Mostra mensagem de sucesso se necessário
            if (showSuccessMessage) {
                const componentNames = specs.components.map((c: { name: string }) => c.name).join(', ');
                vscode.window.showInformationMessage(
                    `Componente(s) gerado(s) com sucesso: ${componentNames}`
                );
            }
        } catch (err) {
            const error = err as Error;
            const errorMessage = `Erro ao gerar componente: ${error.message}`;
            console.error(errorMessage);
            vscode.window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }
    }

    private async createDirectoryStructure(): Promise<void> {
        const directories = [
            path.join(this.workspaceRoot, 'src', 'components'),
            path.join(this.workspaceRoot, 'src', 'services'),
            path.join(this.workspaceRoot, 'src', 'types'),
            path.join(this.workspaceRoot, 'src', 'hooks'),
            path.join(this.workspaceRoot, 'src', 'utils'),
            path.join(this.workspaceRoot, 'src', 'tests'),
            path.join(this.workspaceRoot, 'src', 'styles')
        ];

        for (const dir of directories) {
            try {
                this.ensureDirectoryExists(dir);
                console.log(`Diretório criado/verificado: ${dir}`);
            } catch (error) {
                console.error(`Erro ao criar diretório ${dir}:`, error);
                throw error;
            }
        }
    }

    private async saveGeneratedFiles(files: Record<string, string>): Promise<void> {
        for (const [fileName, content] of Object.entries(files)) {
            try {
                const filePath = path.join(this.workspaceRoot, 'src', fileName);
                console.log(`Tentando salvar arquivo: ${filePath}`);
                
                this.ensureDirectoryExists(path.dirname(filePath));
                
                // Verifica se o arquivo já existe
                if (fs.existsSync(filePath)) {
                    const overwrite = await vscode.window.showQuickPick(
                        ['Sim', 'Não'],
                        {
                            placeHolder: `O arquivo ${fileName} já existe. Deseja sobrescrever?`
                        }
                    );
                    
                    if (overwrite !== 'Sim') {
                        console.log(`Arquivo ${filePath} não será sobrescrito`);
                        continue;
                    }
                }
                
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Arquivo salvo com sucesso: ${filePath}`);
            } catch (error) {
                console.error(`Erro ao salvar arquivo ${fileName}:`, error);
                throw error;
            }
        }
    }

    private ensureDirectoryExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private parseGeneratedCode(code: string): Record<string, string> {
        const files: Record<string, string> = {};
        // Regex melhorado para capturar o nome do arquivo e o conteúdo
        const fileRegex = /```(?:typescript|tsx|jsx)?\s*(?:\/\/\s*([^\n]+)|([^\n]+\.(?:ts|tsx|jsx)))\s*([\s\S]*?)```/g;
        
        let match;
        while ((match = fileRegex.exec(code)) !== null) {
            const [, commentPath, directPath, content] = match;
            const filePath = (commentPath || directPath || '').trim();
            
            if (filePath && content) {
                console.log(`Arquivo encontrado no código: ${filePath}`);
                files[filePath] = content.trim();
            }
        }

        if (Object.keys(files).length === 0) {
            console.warn('Nenhum arquivo encontrado no código gerado:', code);
        }

        return files;
    }
} 