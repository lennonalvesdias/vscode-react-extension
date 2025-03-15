import { TemplateConfig } from '../templates/types';
import * as Handlebars from 'handlebars';

interface Template {
    component: string;
    styles: string;
    service?: string;
}

export class TemplateUtils {
    private static commonFields: { [key: string]: { type: string; validation: string[] } } = {
        email: { type: 'string', validation: ['required', 'email'] },
        senha: { type: 'string', validation: ['required', 'minLength:8'] },
        nome: { type: 'string', validation: ['required'] },
        telefone: { type: 'string', validation: ['required', 'phone'] },
        data: { type: 'date', validation: ['required'] },
        valor: { type: 'number', validation: ['required', 'min:0'] },
        quantidade: { type: 'number', validation: ['required', 'min:0'] }
    };

    public static inferComponentName(request: string): string {
        const requestLower = request.toLowerCase();
        
        // Mapear palavras-chave para nomes de componentes
        const componentNameMap: Record<string, string> = {
            'login': 'Login',
            'autenticação': 'Auth',
            'registro': 'Register',
            'cadastro de usuário': 'UserRegistration',
            'tabela': 'Table',
            'lista': 'List',
            'listagem': 'List',
            'grid': 'Grid',
            'formulário': 'Form',
            'cadastro': 'Registration',
            'edição': 'Edit'
        };

        // Procurar por palavras-chave no request
        for (const [keyword, componentName] of Object.entries(componentNameMap)) {
            if (requestLower.includes(keyword)) {
                // Extrair o contexto do componente (ex: "usuários" em "tabela de usuários")
                const parts = requestLower.split(keyword);
                if (parts[1]) {
                    const context = parts[1].trim()
                        .split(/[\s,]+/) // Dividir por espaços ou vírgulas
                        .filter(part => part && !part.startsWith('de') && !part.startsWith('do') && !part.startsWith('da'))
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                        .join('');
                    
                    if (context) {
                        return `${context}${componentName}`;
                    }
                }
                return componentName;
            }
        }

        // Se nenhum nome específico for encontrado, usar um nome genérico baseado no tipo
        const type = this.inferComponentType(request);
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    private static inferComponentType(request: string): 'auth' | 'table' | 'form' {
        const authKeywords = ['login', 'auth', 'autenticação', 'registro', 'cadastro de usuário'];
        const tableKeywords = ['tabela', 'lista', 'listagem', 'grid', 'dados'];
        const formKeywords = ['formulário', 'form', 'cadastro', 'edição', 'registro'];

        const requestLower = request.toLowerCase();

        if (authKeywords.some(keyword => requestLower.includes(keyword))) {
            return 'auth';
        }

        if (tableKeywords.some(keyword => requestLower.includes(keyword))) {
            return 'table';
        }

        if (formKeywords.some(keyword => requestLower.includes(keyword))) {
            return 'form';
        }

        return 'form'; // Default to form if no specific type is detected
    }

    public static inferFeatures(request: string, componentType: string): Feature[] {
        const features: Feature[] = [];

        // Adicionar feature principal baseada no tipo do componente
        const mainFeature: Feature = { type: componentType as 'auth' | 'table' | 'form' };

        // Adicionar campos baseados no tipo do componente
        if (componentType === 'auth') {
            mainFeature.fields = this.extractFormFields(request);
        } else if (componentType === 'table') {
            mainFeature.fields = this.extractTableFields(request);
        } else if (componentType === 'form') {
            mainFeature.fields = this.extractFormFields(request);
        }

        // Adicionar serviços
        mainFeature.services = this.extractServices(request, componentType);

        features.push(mainFeature);

        // Inferir features adicionais para tabelas
        if (componentType === 'table') {
            const requestLower = request.toLowerCase();
            if (requestLower.includes('paginação') || requestLower.includes('paginado')) {
                features.push({ type: 'pagination' });
            }
            if (requestLower.includes('filtro') || requestLower.includes('filtragem')) {
                features.push({ type: 'filters' });
            }
            if (requestLower.includes('busca') || requestLower.includes('pesquisa')) {
                features.push({ type: 'search' });
            }
            if (requestLower.includes('ordenação') || requestLower.includes('ordenar')) {
                features.push({ type: 'sorting' });
            }
        }

        return features;
    }

    private static extractFormFields(request: string): Field[] {
        const requestLower = request.toLowerCase();
        const fields: Field[] = [];

        // Mapear palavras-chave para tipos de campos
        const fieldMap: Record<string, { type: string, validation?: string[] }> = {
            'nome': { type: 'string', validation: ['required'] },
            'email': { type: 'string', validation: ['required', 'email'] },
            'senha': { type: 'string', validation: ['required', 'minLength:8'] },
            'telefone': { type: 'string', validation: ['required', 'phone'] },
            'data': { type: 'string', validation: ['required'] },
            'valor': { type: 'number', validation: ['required', 'min:0'] },
            'quantidade': { type: 'number', validation: ['required', 'min:1'] },
            'descrição': { type: 'string' },
            'observação': { type: 'string' },
            'endereço': { type: 'string', validation: ['required'] },
            'cidade': { type: 'string', validation: ['required'] },
            'estado': { type: 'string', validation: ['required'] },
            'cep': { type: 'string', validation: ['required'] }
        };

        // Procurar por campos conhecidos no request
        for (const [fieldName, fieldConfig] of Object.entries(fieldMap)) {
            if (requestLower.includes(fieldName)) {
                fields.push({
                    name: fieldName,
                    type: fieldConfig.type,
                    validation: fieldConfig.validation
                });
            }
        }

        // Se nenhum campo for encontrado, adicionar campos padrão baseados no tipo de formulário
        if (fields.length === 0) {
            if (requestLower.includes('login')) {
                fields.push(
                    { name: 'email', type: 'string', validation: ['required', 'email'] },
                    { name: 'senha', type: 'string', validation: ['required', 'minLength:8'] }
                );
            } else if (requestLower.includes('cadastro') || requestLower.includes('registro')) {
                fields.push(
                    { name: 'nome', type: 'string', validation: ['required'] },
                    { name: 'email', type: 'string', validation: ['required', 'email'] },
                    { name: 'senha', type: 'string', validation: ['required', 'minLength:8'] }
                );
            } else {
                fields.push(
                    { name: 'nome', type: 'string', validation: ['required'] },
                    { name: 'email', type: 'string', validation: ['required', 'email'] }
                );
            }
        }

        return fields;
    }

    private static extractTableFields(request: string): Field[] {
        const requestLower = request.toLowerCase();
        const fields: Field[] = [];

        // Mapear palavras-chave para tipos de campos
        const fieldMap: Record<string, { type: string }> = {
            'nome': { type: 'string' },
            'email': { type: 'string' },
            'telefone': { type: 'string' },
            'data': { type: 'string' },
            'valor': { type: 'number' },
            'quantidade': { type: 'number' },
            'descrição': { type: 'string' },
            'observação': { type: 'string' },
            'endereço': { type: 'string' },
            'cidade': { type: 'string' },
            'estado': { type: 'string' },
            'cep': { type: 'string' },
            'status': { type: 'string' },
            'id': { type: 'number' },
            'código': { type: 'string' },
            'data de criação': { type: 'string' },
            'data de atualização': { type: 'string' }
        };

        // Procurar por campos conhecidos no request
        for (const [fieldName, fieldConfig] of Object.entries(fieldMap)) {
            if (requestLower.includes(fieldName)) {
                fields.push({
                    name: fieldName,
                    type: fieldConfig.type
                });
            }
        }

        // Se nenhum campo for encontrado, adicionar campos padrão baseados no contexto
        if (fields.length === 0) {
            if (requestLower.includes('usuário') || requestLower.includes('usuario')) {
                fields.push(
                    { name: 'id', type: 'number' },
                    { name: 'nome', type: 'string' },
                    { name: 'email', type: 'string' },
                    { name: 'status', type: 'string' }
                );
            } else if (requestLower.includes('produto')) {
                fields.push(
                    { name: 'código', type: 'string' },
                    { name: 'nome', type: 'string' },
                    { name: 'valor', type: 'number' },
                    { name: 'quantidade', type: 'number' }
                );
            } else if (requestLower.includes('pedido')) {
                fields.push(
                    { name: 'id', type: 'number' },
                    { name: 'data', type: 'string' },
                    { name: 'valor', type: 'number' },
                    { name: 'status', type: 'string' }
                );
            } else {
                fields.push(
                    { name: 'id', type: 'number' },
                    { name: 'nome', type: 'string' },
                    { name: 'data de criação', type: 'string' }
                );
            }
        }

        return fields;
    }

    public static getTemplate(config: TemplateConfig): Template {
        const template = this.getBaseTemplate(config);
        return {
            component: this.compileTemplate(template.component, config),
            styles: this.compileTemplate(template.styles, config),
            service: template.service ? this.compileTemplate(template.service, config) : undefined
        };
    }

    private static getBaseTemplate(config: TemplateConfig): Template {
        switch (config.type) {
            case 'auth':
                return {
                    component: this.getAuthComponentTemplate(),
                    styles: this.getAuthStylesTemplate(),
                    service: this.getAuthServiceTemplate()
                };
            case 'table':
                return {
                    component: this.getTableComponentTemplate(),
                    styles: this.getTableStylesTemplate()
                };
            case 'form':
                return {
                    component: this.getFormComponentTemplate(),
                    styles: this.getFormStylesTemplate()
                };
            default:
                throw new Error(`Tipo de template não suportado: ${config.type}`);
        }
    }

    private static compileTemplate(template: string, data: TemplateConfig): string {
        const compiledTemplate = Handlebars.compile(template);
        return compiledTemplate(data);
    }

    private static getAuthComponentTemplate(): string {
        return `import React, { useState } from 'react';
import styles from './{{name}}.module.css';
{{#if isTypeScript}}
import { AuthService } from '../../services/authService';

interface {{name}}Props {
    onSuccess: () => void;
    onError: (error: Error) => void;
}

interface FormData {
    email: string;
    password: string;
}
{{/if}}

const {{name}} = ({{#if isTypeScript}}props: {{name}}Props{{/if}}) => {
    const [formData, setFormData] = useState({{#if isTypeScript}}<FormData>{{/if}}({
        email: '',
        password: ''
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await AuthService.login(formData);
            props.onSuccess();
        } catch (error) {
            props.onError(error instanceof Error ? error : new Error('Erro desconhecido'));
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email"
                    className={styles.input}
                />
                <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Senha"
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>
                    Entrar
                </button>
            </form>
        </div>
    );
};

export default {{name}};`;
    }

    private static getAuthStylesTemplate(): string {
        return `.container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--vscode-editor-background);
}

.form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    width: 100%;
    max-width: 400px;
}

.input {
    padding: 0.5rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
}

.input:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
}

.button {
    padding: 0.5rem 1rem;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.button:hover {
    background-color: var(--vscode-button-hoverBackground);
}`;
    }

    private static getAuthServiceTemplate(): string {
        return `{{#if isTypeScript}}
interface LoginData {
    email: string;
    password: string;
}
{{/if}}

export class AuthService {
    private static API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    public static async login(data{{#if isTypeScript}}: LoginData{{/if}}) {
        const response = await fetch(\`\${this.API_URL}/auth/login\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Falha na autenticação');
        }

        const result = await response.json();
        localStorage.setItem('token', result.token);
        return result;
    }

    public static logout() {
        localStorage.removeItem('token');
    }

    public static getToken() {
        return localStorage.getItem('token');
    }

    public static isAuthenticated() {
        return !!this.getToken();
    }
}`;
    }

    private static getTableComponentTemplate(): string {
        return `import React, { useState, useEffect } from 'react';
import styles from './{{name}}.module.css';

{{#if isTypeScript}}
interface {{name}}Props {
    data: Array<Record<string, any>>;
    columns: Array<{
        key: string;
        label: string;
    }>;
    onSort?: (key: string) => void;
}
{{/if}}

const {{name}} = ({{#if isTypeScript}}props: {{name}}Props{{/if}}) => {
    const [sortKey, setSortKey] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const handleSort = (key: string) => {
        if (props.onSort) {
            const newDirection = key === sortKey && sortDirection === 'asc' ? 'desc' : 'asc';
            setSortDirection(newDirection);
            setSortKey(key);
            props.onSort(key);
        }
    };

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {props.columns.map((column) => (
                            <th
                                key={column.key}
                                onClick={() => handleSort(column.key)}
                                className={styles.header}
                            >
                                {column.label}
                                {sortKey === column.key && (
                                    <span className={styles.sortIcon}>
                                        {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, index) => (
                        <tr key={index}>
                            {props.columns.map((column) => (
                                <td key={column.key} className={styles.cell}>
                                    {row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default {{name}};`;
    }

    private static getTableStylesTemplate(): string {
        return `.container {
    width: 100%;
    overflow-x: auto;
}

.table {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
}

.header {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 2px solid var(--vscode-input-border);
    cursor: pointer;
    user-select: none;
}

.header:hover {
    background-color: var(--vscode-list-hoverBackground);
}

.cell {
    padding: 0.75rem;
    border-bottom: 1px solid var(--vscode-input-border);
}

.sortIcon {
    margin-left: 0.5rem;
    font-size: 0.8em;
}

tr:hover {
    background-color: var(--vscode-list-hoverBackground);
}`;
    }

    private static getFormComponentTemplate(): string {
        return `import React, { useState } from 'react';
import styles from './{{name}}.module.css';

{{#if isTypeScript}}
interface {{name}}Props {
    onSubmit: (data: Record<string, any>) => void;
    fields: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
    }>;
}
{{/if}}

const {{name}} = ({{#if isTypeScript}}props: {{name}}Props{{/if}}) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors = {};
        
        props.fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = 'Este campo é obrigatório';
            }
        });

        if (Object.keys(newErrors).length === 0) {
            props.onSubmit(formData);
        } else {
            setErrors(newErrors);
        }
    };

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {props.fields.map(field => (
                <div key={field.name} className={styles.field}>
                    <label className={styles.label}>
                        {field.label}
                        {field.required && <span className={styles.required}>*</span>}
                    </label>
                    <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={styles.input}
                    />
                    {errors[field.name] && (
                        <span className={styles.error}>{errors[field.name]}</span>
                    )}
                </div>
            ))}
            <button type="submit" className={styles.button}>
                Enviar
            </button>
        </form>
    );
};

export default {{name}};`;
    }

    private static getFormStylesTemplate(): string {
        return `.form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
    margin: 0 auto;
    padding: 1rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.label {
    color: var(--vscode-editor-foreground);
    font-weight: 500;
}

.required {
    color: var(--vscode-errorForeground);
    margin-left: 0.25rem;
}

.input {
    padding: 0.5rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
}

.input:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
}

.error {
    color: var(--vscode-errorForeground);
    font-size: 0.875rem;
}

.button {
    padding: 0.5rem 1rem;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 1rem;
}

.button:hover {
    background-color: var(--vscode-button-hoverBackground);
}`; 
    }

    private static toPascalCase(str: string): string {
        return str
            .split(/[^a-zA-Z0-9]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    private static extractServices(request: string, componentType: string): ServiceConfig[] {
        const services: ServiceConfig[] = [];
        const requestLower = request.toLowerCase();

        // Configurar serviço de autenticação
        if (componentType === 'auth') {
            services.push({
                baseURL: '/api',
                endpoints: [
                    { method: 'POST', path: '/auth/login' },
                    { method: 'POST', path: '/auth/register' },
                    { method: 'POST', path: '/auth/logout' }
                ],
                auth: true
            });
        }

        // Configurar serviço de tabela/lista
        if (componentType === 'table') {
            const resourceName = this.extractResourceName(requestLower);
            services.push({
                baseURL: '/api',
                endpoints: [
                    { method: 'GET', path: `/${resourceName}` },
                    { method: 'GET', path: `/${resourceName}/{id}` },
                    { method: 'POST', path: `/${resourceName}` },
                    { method: 'PUT', path: `/${resourceName}/{id}` },
                    { method: 'DELETE', path: `/${resourceName}/{id}` }
                ],
                auth: true
            });
        }

        // Configurar serviço de formulário
        if (componentType === 'form') {
            const resourceName = this.extractResourceName(requestLower);
            services.push({
                baseURL: '/api',
                endpoints: [
                    { method: 'POST', path: `/${resourceName}` },
                    { method: 'PUT', path: `/${resourceName}/{id}` }
                ],
                auth: true
            });
        }

        return services;
    }

    private static extractResourceName(request: string): string {
        const resourceMap: Record<string, string> = {
            'usuário': 'users',
            'usuario': 'users',
            'produto': 'products',
            'pedido': 'orders',
            'categoria': 'categories',
            'cliente': 'customers',
            'fornecedor': 'suppliers'
        };

        for (const [key, value] of Object.entries(resourceMap)) {
            if (request.includes(key)) {
                return value;
            }
        }

        // Se não encontrar um recurso específico, tentar extrair do request
        const words = request.split(/[\s,]+/);
        const resourceWord = words.find(word => 
            !['criar', 'editar', 'listar', 'tabela', 'formulário', 'form', 'de', 'do', 'da'].includes(word)
        );

        if (resourceWord) {
            // Pluralizar e converter para inglês (simplificado)
            return resourceWord + 's';
        }

        return 'items';
    }

    public static generateComponent(request: string, isTypeScript: boolean): ComponentTemplate {
        const componentName = this.inferComponentName(request);
        const componentType = this.inferComponentType(request);
        const features = this.inferFeatures(request, componentType);

        const config: TemplateConfig = {
            name: componentName,
            type: componentType,
            isTypeScript,
            features
        };

        return this.getTemplate(config);
    }
} 