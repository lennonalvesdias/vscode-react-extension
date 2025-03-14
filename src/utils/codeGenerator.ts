import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIHelper } from './aiHelper';

interface Feature {
    type: string;
    fields?: { name: string; type: string; }[];
    importComponent?: string;
    targetFile?: string;
    component?: string;
    props?: { [key: string]: string };
}

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
            
            if (!aiResponse.newName) {
                throw new Error('Nome do componente não fornecido');
            }

            // Verificar se é uma operação de importação/uso
            const importFeature = aiResponse.features.find((f: Feature) => f.type === 'import');
            const usageFeature = aiResponse.features.find((f: Feature) => f.type === 'usage');
            
            if (importFeature || usageFeature) {
                return await this.modifyExistingFile(aiResponse);
            }

            if (aiResponse.action === 'edit') {
                if (!aiResponse.oldName) {
                    throw new Error('Nome do componente a ser editado não fornecido');
                }
                return await this.editComponent(aiResponse);
            } else if (aiResponse.action === 'delete') {
                if (!aiResponse.oldName) {
                    throw new Error('Nome do componente a ser removido não fornecido');
                }
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

    private async modifyExistingFile(aiResponse: any): Promise<string> {
        const importFeature = aiResponse.features.find((f: Feature) => f.type === 'import');
        const usageFeature = aiResponse.features.find((f: Feature) => f.type === 'usage');
        const targetFile = importFeature?.targetFile || '';

        if (!targetFile) {
            throw new Error('Arquivo alvo não especificado');
        }

        const filePath = this.findFile(targetFile);
        if (!filePath) {
            throw new Error(`Arquivo ${targetFile} não encontrado`);
        }

        let fileContent = fs.readFileSync(filePath, 'utf-8');
        let modified = false;

        // Adicionar importação se necessário
        if (importFeature) {
            const importStatement = `import { ${importFeature.importComponent} } from './components/${importFeature.importComponent}';`;
            if (!fileContent.includes(importStatement)) {
                // Encontrar o último import ou o início do arquivo
                const lastImportIndex = fileContent.lastIndexOf('import');
                const lastImportLineEnd = lastImportIndex !== -1 
                    ? fileContent.indexOf('\n', lastImportIndex) + 1
                    : 0;

                fileContent = fileContent.slice(0, lastImportLineEnd) +
                    importStatement + '\n' +
                    fileContent.slice(lastImportLineEnd);
                modified = true;
            }
        }

        // Adicionar uso do componente se necessário
        if (usageFeature) {
            const componentUsage = this.generateComponentUsage(usageFeature);
            
            // Encontrar o return do componente
            const returnIndex = fileContent.indexOf('return (');
            if (returnIndex !== -1) {
                // Encontrar o primeiro elemento após o return
                const openingBracket = fileContent.indexOf('<', returnIndex);
                const closingBracket = this.findMatchingBracket(fileContent, openingBracket);
                
                if (openingBracket !== -1 && closingBracket !== -1) {
                    // Se já existe um div/fragment, inserir dentro
                    const elementContent = fileContent.substring(openingBracket, closingBracket + 1);
                    if (elementContent.includes('<div') || elementContent.includes('<>')) {
                        const lastClosingTag = elementContent.lastIndexOf('</');
                        const insertPosition = returnIndex + elementContent.lastIndexOf('</');
                        
                        fileContent = fileContent.slice(0, insertPosition) +
                            '      ' + componentUsage + '\n      ' +
                            fileContent.slice(insertPosition);
                    } else {
                        // Envolver em um div
                        const newContent = `<div>\n      ${elementContent}\n      ${componentUsage}\n    </div>`;
                        fileContent = fileContent.slice(0, openingBracket) +
                            newContent +
                            fileContent.slice(closingBracket + 1);
                    }
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, fileContent);
            return `Arquivo ${targetFile} atualizado com sucesso!`;
        }

        return `Nenhuma modificação necessária em ${targetFile}`;
    }

    private findFile(fileName: string): string | null {
        const possiblePaths = [
            path.join(this.workspaceRoot, fileName),
            path.join(this.workspaceRoot, 'src', fileName),
            path.join(this.workspaceRoot, 'src', 'pages', fileName),
            path.join(this.workspaceRoot, 'src', 'components', fileName)
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    private generateComponentUsage(feature: any): string {
        const { component, props = {} } = feature;
        const propsString = Object.entries(props)
            .map(([key, value]) => `${key}={${value}}`)
            .join('\n        ');

        return `<${component}\n        ${propsString}\n      />`;
    }

    private findMatchingBracket(content: string, openingIndex: number): number {
        let count = 1;
        let i = openingIndex + 1;
        
        while (count > 0 && i < content.length) {
            if (content[i] === '<' && content[i + 1] !== '/') count++;
            if (content[i] === '<' && content[i + 1] === '/') count--;
            if (content[i] === '/' && content[i + 1] === '>') count--;
            i++;
        }
        
        return i;
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
        const hasPagination = config.features.some(f => f.type === 'pagination');
        const hasFilters = config.features.some(f => f.type === 'filters');
        const hasSearch = config.features.some(f => f.type === 'search');
        const hasSorting = config.features.some(f => f.type === 'sorting');

        let imports = `import React, { useState, useEffect, useMemo } from 'react';\n`;
        imports += `import styles from './${config.name}.module.css';\n`;
        imports += `import { ${config.name}Props } from './types';\n`;

        if (hasTable) {
            imports += `import { Table, TableHead, TableBody, TableRow, TableCell, TablePagination } from '@mui/material';\n`;
            imports += `import { Paper, TextField, IconButton, InputAdornment } from '@mui/material';\n`;
            imports += `import SearchIcon from '@mui/icons-material/Search';\n`;
            imports += `import FilterListIcon from '@mui/icons-material/FilterList';\n`;
            imports += `import SortIcon from '@mui/icons-material/Sort';\n`;
        }

        let componentContent = '';
        if (hasTable) {
            componentContent = this.getEnhancedTableTemplate(
                config.features.find(f => f.type === 'table')?.fields || [],
                hasPagination,
                hasFilters,
                hasSearch,
                hasSorting
            );
        } else if (hasForm) {
            componentContent = this.getFormTemplate(config.features.find(f => f.type === 'form')?.fields || []);
        }

        return `${imports}
export const ${config.name}: React.FC<${config.name}Props> = ({ data = [], onEdit, onDelete }) => {
    ${this.getStateDefinitions(hasPagination, hasFilters, hasSearch, hasSorting)}
    ${this.getHandlerMethods(hasPagination, hasFilters, hasSearch, hasSorting)}
    ${this.getFilterMethods(hasFilters, hasSearch)}
    ${this.getMemoizedData(hasFilters, hasSearch, hasSorting)}

    return (
        ${componentContent}
    );
};`;
    }

    private getStateDefinitions(hasPagination: boolean, hasFilters: boolean, hasSearch: boolean, hasSorting: boolean): string {
        let state = '';
        
        if (hasPagination) {
            state += `
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);`;
        }
        
        if (hasSearch) {
            state += `
    const [searchTerm, setSearchTerm] = useState('');`;
        }
        
        if (hasFilters) {
            state += `
    const [filters, setFilters] = useState({});`;
        }
        
        if (hasSorting) {
            state += `
    const [sortConfig, setSortConfig] = useState({ field: '', direction: 'asc' });`;
        }
        
        return state;
    }

    private getHandlerMethods(hasPagination: boolean, hasFilters: boolean, hasSearch: boolean, hasSorting: boolean): string {
        let handlers = '';
        
        if (hasPagination) {
            handlers += `
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };`;
        }
        
        if (hasSearch) {
            handlers += `
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };`;
        }
        
        if (hasFilters) {
            handlers += `
    const handleFilterChange = (field: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setPage(0);
    };`;
        }
        
        if (hasSorting) {
            handlers += `
    const handleSort = (field: string) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };`;
        }
        
        return handlers;
    }

    private getFilterMethods(hasFilters: boolean, hasSearch: boolean): string {
        if (!hasFilters && !hasSearch) return '';
        
        return `
    const filterData = (data: any[]) => {
        return data.filter(item => {
            let matchesSearch = true;
            let matchesFilters = true;
            
            ${hasSearch ? `
            if (searchTerm) {
                matchesSearch = Object.values(item)
                    .some(value => 
                        String(value).toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    );
            }` : ''}
            
            ${hasFilters ? `
            if (Object.keys(filters).length) {
                matchesFilters = Object.entries(filters).every(([field, value]) => {
                    if (!value) return true;
                    return String(item[field]).toLowerCase()
                        .includes(String(value).toLowerCase());
                });
            }` : ''}
            
            return matchesSearch && matchesFilters;
        });
    };`;
    }

    private getMemoizedData(hasFilters: boolean, hasSearch: boolean, hasSorting: boolean): string {
        if (!hasFilters && !hasSearch && !hasSorting) return '';
        
        return `
    const filteredData = useMemo(() => {
        let processed = [...data];
        
        ${hasFilters || hasSearch ? 'processed = filterData(processed);' : ''}
        
        ${hasSorting ? `
        if (sortConfig.field) {
            processed.sort((a, b) => {
                if (a[sortConfig.field] < b[sortConfig.field]) 
                    return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.field] > b[sortConfig.field]) 
                    return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }` : ''}
        
        return processed;
    }, [data${hasSearch ? ', searchTerm' : ''}${hasFilters ? ', filters' : ''}${hasSorting ? ', sortConfig' : ''}]);`;
    }

    private getEnhancedTableTemplate(
        fields: { name: string; type: string; }[],
        hasPagination: boolean,
        hasFilters: boolean,
        hasSearch: boolean,
        hasSorting: boolean
    ): string {
        const columns = fields.length > 0 ? fields : [
            { name: 'id', type: 'number' },
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string' },
            { name: 'phone', type: 'string' },
            { name: 'status', type: 'string' }
        ];

        return `<Paper className={styles.container}>
            ${this.getTableToolbar(hasSearch, hasFilters)}
            <Table className={styles.table}>
                <TableHead>
                    <TableRow>
                        ${columns.map(field => `
                        <TableCell>
                            <div className={styles.headerCell}>
                                ${field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                                ${hasSorting ? `
                                <IconButton
                                    size="small"
                                    onClick={() => handleSort('${field.name}')}
                                >
                                    <SortIcon className={
                                        sortConfig.field === '${field.name}'
                                            ? styles.activeSortIcon
                                            : styles.sortIcon
                                    } />
                                </IconButton>` : ''}
                            </div>
                        </TableCell>`).join('\n                        ')}
                        <TableCell>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {${hasPagination ? 'filteredData' : 'data'}
                        ${hasPagination ? '.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)' : ''}
                        .map((item) => (
                        <TableRow key={item.id}>
                            ${columns.map(field => `<TableCell>{item.${field.name}}</TableCell>`).join('\n                            ')}
                            <TableCell>
                                <div className={styles.actions}>
                                    <IconButton
                                        size="small"
                                        onClick={() => onEdit?.(item)}
                                        className={styles.editButton}
                                    >
                                        ✏️
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => onDelete?.(item.id)}
                                        className={styles.deleteButton}
                                    >
                                        🗑️
                                    </IconButton>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            ${hasPagination ? `
            <TablePagination
                component="div"
                count={filteredData.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Linhas por página:"
                labelDisplayedRows={({ from, to, count }) => 
                    \`\${from}-\${to} de \${count}\`}
            />` : ''}
        </Paper>`;
    }

    private getTableToolbar(hasSearch: boolean, hasFilters: boolean): string {
        if (!hasSearch && !hasFilters) return '';

        return `
            <div className={styles.toolbar}>
                ${hasSearch ? `
                <TextField
                    className={styles.searchField}
                    variant="outlined"
                    size="small"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={handleSearch}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        )
                    }}
                />` : ''}
                ${hasFilters ? `
                <div className={styles.filters}>
                    <IconButton
                        size="small"
                        className={styles.filterButton}
                        onClick={() => {/* Implementar lógica de filtros */}}
                    >
                        <FilterListIcon />
                    </IconButton>
                </div>` : ''}
            </div>`;
    }

    private getStylesTemplate(config: ComponentConfig): string {
        const hasTable = config.features.some(f => f.type === 'table');
        const hasForm = config.features.some(f => f.type === 'form');

        let styles = `.container {\n  padding: 20px;\n  width: 100%;\n}\n`;

        if (hasTable) {
            styles += `
.table {
    min-width: 650px;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    gap: 16px;
}

.searchField {
    flex: 1;
    max-width: 500px;
}

.headerCell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sortIcon {
    opacity: 0.5;
}

.activeSortIcon {
    opacity: 1;
    color: #1976d2;
}

.actions {
    display: flex;
    gap: 8px;
}

.editButton {
    color: #1976d2;
}

.deleteButton {
    color: #d32f2f;
}

.filters {
    display: flex;
    gap: 8px;
}

.filterButton {
    color: #666;
}

.filterButton:hover {
    color: #1976d2;
}
`;
        }

        if (hasForm) {
            styles += this.getFormStyles();
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
                { name: 'name', type: 'string' },
                { name: 'email', type: 'string' },
                { name: 'phone', type: 'string' },
                { name: 'status', type: 'string' }
            ];

            content += `
export interface TableItem {
    ${fields.map(field => `${field.name}: ${field.type};`).join('\n    ')}
}

export interface ${config.name}Props {
    data: TableItem[];
    onEdit?: (item: TableItem) => void;
    onDelete?: (id: number) => void;
}

export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

export interface Filters {
    [key: string]: any;
}
`;
        } else if (hasForm) {
            content += this.getFormTypes(formFeature?.fields || [], config.name);
        }

        return content;
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

    private getFormStyles(): string {
        return `
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

    private getFormTypes(fields: { name: string; type: string; }[], componentName: string): string {
        return `
export interface FormData {
  ${fields.map(field => `${field.name}: ${field.type};`).join('\n  ')}
}

export interface ${componentName}Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => void;
}
`;
    }
} 