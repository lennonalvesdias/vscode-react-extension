export interface TemplateConfig {
    name: string;
    type: 'auth' | 'table' | 'form';
    features: Feature[];
    isTypeScript: boolean;
}

export interface AIResponse {
    action: 'create' | 'edit' | 'delete';
    oldName?: string;
    newName: string;
    componentType: 'auth' | 'table' | 'form' | 'page';
    features: Feature[];
}

export interface Feature {
    type: 'auth' | 'table' | 'form' | 'pagination' | 'filters' | 'search' | 'sorting';
    fields?: Field[];
    services?: ServiceConfig[];
}

export interface Field {
    name: string;
    type: string;
    validation?: string[];
}

export interface ValidationRule {
    type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
    value?: string | number | RegExp;
    message: string;
}

export interface ServiceConfig {
    baseURL: string;
    endpoints: Endpoint[];
    auth?: boolean;
}

export interface Endpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
}

export interface RouteConfig {
    path: string;
    isPrivate?: boolean;
    layout?: string;
}

export interface ComponentTemplate {
    name: string;
    component: string;
    styles: string;
    service?: string;
    types?: string;
}

export interface StyleTemplate {
    container: string;
    form?: string;
    table?: string;
    auth?: string;
}

export interface ServiceTemplate {
    auth?: string;
    api?: string;
}

export interface TemplateResult {
    files: {
        path: string;
        content: string;
    }[];
    dependencies: string[];
} 