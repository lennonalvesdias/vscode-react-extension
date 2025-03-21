import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIHelper } from './aiHelper';
import { TemplateUtils } from './templateUtils';
import { TemplateConfig, AIResponse } from '../templates/types';

export class ReactCodeGenerator {
    private workspaceRoot: string;
    private aiHelper: AIHelper;
    private isTypeScript: boolean;

    constructor() {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('Nenhum projeto aberto');
        }
        this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        this.aiHelper = new AIHelper();
        this.isTypeScript = fs.existsSync(path.join(this.workspaceRoot, 'tsconfig.json'));
    }

    public async generateComponent(request: string): Promise<string> {
        const response = await this.aiHelper.parseRequest(request);

        switch (response.action) {
            case 'create':
                return await this.createComponent(response);
            case 'edit':
                return await this.editComponent(response);
            case 'delete':
                return await this.deleteComponent(response);
            default:
                throw new Error(`Ação não suportada: ${response.action}`);
        }
    }

    private async createComponent(response: AIResponse): Promise<string> {
        try {
            const config: TemplateConfig = {
                name: response.newName,
                type: response.componentType === 'page' ? 'auth' : response.componentType as 'auth' | 'table' | 'form',
                features: response.features,
                isTypeScript: this.isTypeScript
            };

            const template = TemplateUtils.getTemplate(config);
            const baseDir = path.join(this.workspaceRoot, 'src', response.componentType === 'page' ? 'pages' : 'components');
            await fs.promises.mkdir(baseDir, { recursive: true });

            const componentDir = path.join(baseDir, config.name);
            await fs.promises.mkdir(componentDir, { recursive: true });

            const files = [
                {
                    path: path.join(componentDir, `${config.name}.${this.isTypeScript ? 'tsx' : 'jsx'}`),
                    content: template.component
                },
                {
                    path: path.join(componentDir, `${config.name}.module.css`),
                    content: template.styles
                }
            ];

            if (template.service) {
                const servicesDir = path.join(this.workspaceRoot, 'src', 'services');
                await fs.promises.mkdir(servicesDir, { recursive: true });
                
                files.push({
                    path: path.join(servicesDir, `authService.${this.isTypeScript ? 'ts' : 'js'}`),
                    content: template.service
                });
            }

            await Promise.all(files.map(file => 
                fs.promises.writeFile(file.path, file.content)
            ));

            return `Componente ${config.name} criado com sucesso em ${componentDir}!`;
        } catch (error) {
            console.error('Erro ao criar componente:', error);
            throw new Error(`Falha ao criar componente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    private async editComponent(response: AIResponse): Promise<string> {
        const oldPath = this.findComponentPath(response.oldName);
        if (!oldPath) {
            throw new Error(`Componente ${response.oldName} não encontrado`);
        }

        const config: TemplateConfig = {
            name: response.newName,
            type: response.componentType === 'page' ? 'auth' : response.componentType as 'auth' | 'table' | 'form',
            features: response.features,
            isTypeScript: this.isTypeScript
        };

        const template = TemplateUtils.getTemplate(config);
        const newDir = path.join(
            this.workspaceRoot, 
            'src', 
            response.componentType === 'page' ? 'pages' : 'components',
            config.name
        );

        if (fs.existsSync(oldPath)) {
            fs.rmSync(oldPath, { recursive: true });
        }

        await fs.promises.mkdir(newDir, { recursive: true });

        const files = [
            {
                path: path.join(newDir, `${config.name}.${this.isTypeScript ? 'tsx' : 'jsx'}`),
                content: template.component
            },
            {
                path: path.join(newDir, `${config.name}.module.css`),
                content: template.styles
            }
        ];

        await Promise.all(files.map(file => 
            fs.promises.writeFile(file.path, file.content)
        ));

        return `Componente ${response.oldName} atualizado para ${config.name} com sucesso!`;
    }

    private async deleteComponent(response: AIResponse): Promise<string> {
        const componentPath = this.findComponentPath(response.oldName);
        if (!componentPath) {
            throw new Error(`Componente ${response.oldName} não encontrado`);
        }

        fs.rmSync(componentPath, { recursive: true });
        return `Componente ${response.oldName} removido com sucesso!`;
    }

    private findComponentPath(name: string | undefined): string | null {
        if (!name) return null;
        
        const possiblePaths = [
            path.join(this.workspaceRoot, 'src', 'components', name),
            path.join(this.workspaceRoot, 'src', 'pages', name)
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }
} 