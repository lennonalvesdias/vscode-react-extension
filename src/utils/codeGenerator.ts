import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIHelper } from './aiHelper';

interface ComponentConfig {
    name: string;
    type: 'page' | 'component';
    features: {
        type: string;
        fields?: { name: string; type: string; }[];
    }[];
}

export class ReactCodeGenerator {
    private workspaceRoot: string;
    private aiHelper: AIHelper;

    constructor() {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('Nenhum workspace aberto');
        }
        this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        this.aiHelper = new AIHelper();
    }

    public async generateComponent(request: string): Promise<string> {
        try {
            const aiResponse = await this.aiHelper.parseRequest(request);
            
            if (aiResponse.action === 'edit') {
                return await this.editComponent(aiResponse);
            } else if (aiResponse.action === 'delete') {
                return await this.deleteComponent(aiResponse);
            }

            const config: ComponentConfig = {
                name: aiResponse.newName,
                type: aiResponse.componentType === 'page' ? 'page' : 'component',
                features: aiResponse.features
            };

            const componentDir = this.createComponentDirectory(config);
            await this.generateFiles(config, componentDir);

            return `Componente ${config.name} criado com sucesso!`;
        } catch (error) {
            console.error('Erro:', error);
            throw error;
        }
    }

    private async editComponent(aiResponse: any): Promise<string> {
        const oldPath = this.findComponentPath(aiResponse.oldName);
        if (!oldPath) {
            throw new Error(`Componente ${aiResponse.oldName} não encontrado`);
        }

        const config: ComponentConfig = {
            name: aiResponse.newName,
            type: aiResponse.componentType === 'page' ? 'page' : 'component',
            features: aiResponse.features
        };

        const newDir = this.createComponentDirectory(config);
        
        // Copiar arquivos existentes para novo diretório
        if (fs.existsSync(oldPath)) {
            fs.rmSync(oldPath, { recursive: true });
        }

        // Gerar novos arquivos
        await this.generateFiles(config, newDir);

        return `Componente ${aiResponse.oldName} atualizado para ${config.name} com sucesso!`;
    }

    private async deleteComponent(aiResponse: any): Promise<string> {
        const componentPath = this.findComponentPath(aiResponse.oldName);
        if (!componentPath) {
            throw new Error(`Componente ${aiResponse.oldName} não encontrado`);
        }

        fs.rmSync(componentPath, { recursive: true });
        return `Componente ${aiResponse.oldName} removido com sucesso!`;
    }

    private findComponentPath(name: string): string | null {
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

    private createComponentDirectory(config: ComponentConfig): string {
        const baseDir = path.join(this.workspaceRoot, 'src', config.type === 'page' ? 'pages' : 'components');
        
        if (!fs.existsSync(path.join(this.workspaceRoot, 'src'))) {
            fs.mkdirSync(path.join(this.workspaceRoot, 'src'));
        }
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir);
        }

        const componentDir = path.join(baseDir, config.name);
        if (!fs.existsSync(componentDir)) {
            fs.mkdirSync(componentDir);
        }

        return componentDir;
    }

    private async generateFiles(config: ComponentConfig, componentDir: string): Promise<void> {
        await this.generateMainComponent(config, componentDir);
        await this.generateStyles(config, componentDir);
        await this.generateTypes(config, componentDir);
    }

    private async generateMainComponent(config: ComponentConfig, componentDir: string): Promise<void> {
        let content = this.getReactComponentTemplate(config);
        fs.writeFileSync(path.join(componentDir, `${config.name}.tsx`), content);
    }

    private async generateStyles(config: ComponentConfig, componentDir: string): Promise<void> {
        let content = this.getStylesTemplate(config);
        fs.writeFileSync(path.join(componentDir, `${config.name}.module.css`), content);
    }

    private async generateTypes(config: ComponentConfig, componentDir: string): Promise<void> {
        let content = this.getTypesTemplate(config);
        fs.writeFileSync(path.join(componentDir, `types.ts`), content);
    }

    private getReactComponentTemplate(config: ComponentConfig): string {
        const hasTable = config.features.some(f => f.type === 'table');
        const hasForm = config.features.some(f => f.type === 'form');

        let imports = `import React from 'react';\nimport styles from './${config.name}.module.css';\n`;
        imports += `import { ${config.name}Props } from './types';\n`;

        let componentContent = '';
        if (hasTable) {
            componentContent = this.getTableTemplate(config.features.find(f => f.type === 'table')?.fields || []);
        } else if (hasForm) {
            componentContent = this.getFormTemplate(config.features.find(f => f.type === 'form')?.fields || []);
        } else {
            componentContent = '<div className={styles.container}>\n      <h1>New Component</h1>\n    </div>';
        }

        return `${imports}
export const ${config.name}: React.FC<${config.name}Props> = (props) => {
  return (
    ${componentContent}
  );
};`;
    }

    private getTableTemplate(fields: { name: string; type: string; }[]): string {
        const columns = fields.length > 0 ? fields : [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }];
        
        return `<div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            ${columns.map(field => `<th>${field.name}</th>`).join('\n            ')}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {props.data.map((item) => (
            <tr key={item.id}>
              ${columns.map(field => `<td>{item.${field.name}}</td>`).join('\n              ')}
              <td>
                <button onClick={() => props.onEdit?.(item)}>Editar</button>
                <button onClick={() => props.onDelete?.(item.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>`;
    }

    private getFormTemplate(fields: { name: string; type: string; }[]): string {
        const formFields = fields.length > 0 ? fields : [{ name: 'name', type: 'string' }];
        
        return `<form className={styles.form} onSubmit={props.onSubmit}>
      ${formFields.map(field => `
      <div className={styles.formGroup}>
        <label htmlFor="${field.name}">${field.name}:</label>
        <input type="${this.getInputType(field.type)}" id="${field.name}" name="${field.name}" />
      </div>`).join('\n      ')}
      <button type="submit">Salvar</button>
    </form>`;
    }

    private getInputType(type: string): string {
        switch (type.toLowerCase()) {
            case 'number': return 'number';
            case 'date': return 'date';
            case 'email': return 'email';
            case 'password': return 'password';
            default: return 'text';
        }
    }

    private getStylesTemplate(config: ComponentConfig): string {
        const hasTable = config.features.some(f => f.type === 'table');
        const hasForm = config.features.some(f => f.type === 'form');

        let styles = `.container {\n  padding: 20px;\n}\n`;

        if (hasTable) {
            styles += `
.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.table tr:hover {
  background-color: #f9f9f9;
}
`;
        }

        if (hasForm) {
            styles += `
.form {
  max-width: 500px;
  margin: 0 auto;
}

.formGroup {
  margin-bottom: 15px;
}

.formGroup label {
  display: block;
  margin-bottom: 5px;
}

.formGroup input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0052a3;
}
`;
        }

        return styles;
    }

    private getTypesTemplate(config: ComponentConfig): string {
        const hasTable = config.features.some(f => f.type === 'table');
        const hasForm = config.features.some(f => f.type === 'form');
        const tableFeature = config.features.find(f => f.type === 'table');
        const formFeature = config.features.find(f => f.type === 'form');

        let content = '';

        if (hasTable) {
            const fields = tableFeature?.fields || [
                { name: 'id', type: 'number' },
                { name: 'name', type: 'string' }
            ];

            content += `
export interface TableItem {
  ${fields.map(field => `${field.name}: ${field.type};`).join('\n  ')}
}

export interface ${config.name}Props {
  data: TableItem[];
  onEdit?: (item: TableItem) => void;
  onDelete?: (id: number) => void;
}
`;
        } else if (hasForm) {
            const fields = formFeature?.fields || [
                { name: 'name', type: 'string' }
            ];

            content += `
export interface FormData {
  ${fields.map(field => `${field.name}: ${field.type};`).join('\n  ')}
}

export interface ${config.name}Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => void;
}
`;
        } else {
            content += `
export interface ${config.name}Props {
  // Add your props here
}
`;
        }

        return content;
    }
} 