import { TemplateConfig, Feature, Field, ComponentTemplate, ServiceConfig } from '../templates/types';
import { loginPageTemplate } from '../templates/pages/LoginPage.template';
import { authServiceTemplate } from '../templates/services/authService.template';
import { authStyles } from '../templates/styles/auth.styles';
import { tableTemplate } from '../templates/components/Table.template';
import { tableStyles } from '../templates/styles/table.styles';
import { formTemplate } from '../templates/components/Form.template';
import { formStyles } from '../templates/styles/form.styles';
import Handlebars from 'handlebars';

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

    public static getTemplate(config: TemplateConfig): ComponentTemplate {
        switch (config.type) {
            case 'auth':
                return this.loadAuthTemplate(config);
            case 'table':
                return this.loadTableTemplate(config);
            case 'form':
                return this.loadFormTemplate(config);
            default:
                throw new Error(`Template type '${config.type}' not supported`);
        }
    }

    private static loadAuthTemplate(config: TemplateConfig): ComponentTemplate {
        const template = config.isTypeScript ? loginPageTemplate.typescript : loginPageTemplate.javascript;
        const compiledTemplate = Handlebars.compile(template)({
            name: config.name
        });

        return {
            name: config.name,
            component: compiledTemplate,
            styles: authStyles,
            types: ''
        };
    }

    private static loadTableTemplate(config: TemplateConfig): ComponentTemplate {
        const template = config.isTypeScript ? tableTemplate.typescript : tableTemplate.javascript;
        const hasPagination = config.features?.some(f => f.type === 'pagination') ?? false;
        const hasFilters = config.features?.some(f => f.type === 'filters') ?? false;
        const hasSearch = config.features?.some(f => f.type === 'search') ?? false;
        const hasSorting = config.features?.some(f => f.type === 'sorting') ?? false;

        const compiledTemplate = Handlebars.compile(template)({
            name: config.name,
            fields: config.features?.[0]?.fields || [],
            hasPagination,
            hasFilters,
            hasSearch,
            hasSorting
        });

        return {
            name: config.name,
            component: compiledTemplate,
            styles: tableStyles,
            types: ''
        };
    }

    private static loadFormTemplate(config: TemplateConfig): ComponentTemplate {
        const template = config.isTypeScript ? formTemplate.typescript : formTemplate.javascript;
        const compiledTemplate = Handlebars.compile(template)({
            name: config.name,
            fields: config.features?.[0]?.fields || []
        });

        return {
            name: config.name,
            component: compiledTemplate,
            styles: formStyles,
            types: ''
        };
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