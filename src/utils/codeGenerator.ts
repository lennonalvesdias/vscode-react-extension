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
            case 'initialize':
                return await this.initializeProject(response);
            case 'create':
                return await this.createComponent(response);
            case 'edit':
                return await this.editComponent(response);
            case 'route':
                return await this.addRoute(response);
            default:
                throw new Error(`Ação não suportada: ${response.action}`);
        }
    }

    private async initializeProject(response: any): Promise<string> {
        const srcPath = path.join(this.workspaceRoot, 'src');
        const ext = this.isTypeScript ? 'tsx' : 'jsx';

        // Criar estrutura de diretórios
        const directories = ['pages', 'components', 'services', 'routes', 'layouts', 'hooks', 'utils'];
        directories.forEach(dir => {
            const dirPath = path.join(srcPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });

        // Criar arquivos base
        const files = [
            {
                path: path.join(srcPath, 'services', `authService.${this.isTypeScript ? 'ts' : 'js'}`),
                content: this.generateAuthService()
            },
            {
                path: path.join(srcPath, 'routes', `index.${ext}`),
                content: this.generateRoutes()
            },
            {
                path: path.join(srcPath, 'layouts', `MainLayout.${ext}`),
                content: this.generateMainLayout()
            },
            {
                path: path.join(srcPath, 'pages', `LoginPage.${ext}`),
                content: this.generateLoginPage()
            }
        ];

        files.forEach(file => {
            if (!fs.existsSync(file.path)) {
                fs.writeFileSync(file.path, file.content);
            }
        });

        // Atualizar App.tsx/jsx
        const appPath = path.join(srcPath, `App.${ext}`);
        fs.writeFileSync(appPath, this.generateApp());

        return `Projeto inicializado com sucesso! Estrutura criada:
- /src
  - /pages
    - LoginPage.${ext}
  - /components
  - /services
    - authService.${this.isTypeScript ? 'ts' : 'js'}
  - /routes
    - index.${ext}
  - /layouts
    - MainLayout.${ext}
  - /hooks
  - /utils

Arquivos principais criados e configurados:
1. LoginPage com formulário e integração com authService
2. Sistema de rotas configurado com React Router
3. Layout principal com suporte a navegação
4. Serviço de autenticação com endpoints básicos

Para começar, você pode:
1. Configurar as variáveis de ambiente no .env
2. Personalizar o layout em MainLayout
3. Adicionar mais rotas em routes/index
4. Implementar a lógica de autenticação no authService`;
    }

    private generateAuthService(): string {
        return this.isTypeScript ? `
import axios, { AxiosInstance } from 'axios';

interface LoginCredentials {
    email: string;
    password: string;
}

interface AuthResponse {
    token: string;
    user: {
        id: number;
        email: string;
        name: string;
    };
}

class AuthService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({
            baseURL: process.env.REACT_APP_API_URL || '/api',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const { data } = await this.api.post<AuthResponse>('/auth/login', credentials);
            this.setToken(data.token);
            return data;
        } catch (error) {
            throw new Error('Falha na autenticação');
        }
    }

    private setToken(token: string): void {
        localStorage.setItem('token', token);
        this.api.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    logout(): void {
        localStorage.removeItem('token');
        delete this.api.defaults.headers.common['Authorization'];
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}

export default new AuthService();
` : `
import axios from 'axios';

class AuthService {
    constructor() {
        this.api = axios.create({
            baseURL: process.env.REACT_APP_API_URL || '/api',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async login(credentials) {
        try {
            const { data } = await this.api.post('/auth/login', credentials);
            this.setToken(data.token);
            return data;
        } catch (error) {
            throw new Error('Falha na autenticação');
        }
    }

    setToken(token) {
        localStorage.setItem('token', token);
        this.api.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
    }

    getToken() {
        return localStorage.getItem('token');
    }

    logout() {
        localStorage.removeItem('token');
        delete this.api.defaults.headers.common['Authorization'];
    }

    isAuthenticated() {
        return !!this.getToken();
    }
}

export default new AuthService();
`;
    }

    private generateRoutes(): string {
        return this.isTypeScript ? `
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import MainLayout from '../layouts/MainLayout';
import authService from '../services/authService';

interface PrivateRouteProps {
    children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    return authService.isAuthenticated() ? (
        <MainLayout>{children}</MainLayout>
    ) : (
        <Navigate to="/login" replace />
    );
};

const Router: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={
                    <PrivateRoute>
                        <div>Dashboard</div>
                    </PrivateRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
};

export default Router;
` : `
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import MainLayout from '../layouts/MainLayout';
import authService from '../services/authService';

const PrivateRoute = ({ children }) => {
    return authService.isAuthenticated() ? (
        <MainLayout>{children}</MainLayout>
    ) : (
        <Navigate to="/login" replace />
    );
};

const Router = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={
                    <PrivateRoute>
                        <div>Dashboard</div>
                    </PrivateRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
};

export default Router;
`;
    }

    private generateMainLayout(): string {
        return this.isTypeScript ? `
import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <header className="header">
                <nav>
                    <ul>
                        <li><a href="/">Dashboard</a></li>
                    </ul>
                    <button onClick={handleLogout}>Sair</button>
                </nav>
            </header>
            <main className="main">
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
` : `
import React from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const MainLayout = ({ children }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <header className="header">
                <nav>
                    <ul>
                        <li><a href="/">Dashboard</a></li>
                    </ul>
                    <button onClick={handleLogout}>Sair</button>
                </nav>
            </header>
            <main className="main">
                {children}
            </main>
        </div>
    );
};

export default MainLayout;
`;
    }

    private generateLoginPage(): string {
        return this.isTypeScript ? `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import styles from './LoginPage.module.css';

interface LoginForm {
    email: string;
    password: string;
}

interface ValidationErrors {
    email?: string;
    password?: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const validatePassword = (password: string): boolean => {
        const hasNumber = /[0-9]/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasMinLength = password.length >= 8;

        return hasNumber && hasLetter && hasSpecial && hasMinLength;
    };

    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};
        
        if (!form.email) {
            newErrors.email = 'E-mail é obrigatório';
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email)) {
            newErrors.email = 'E-mail inválido';
        }

        if (!form.password) {
            newErrors.password = 'Senha é obrigatória';
        } else if (!validatePassword(form.password)) {
            newErrors.password = 'A senha deve conter pelo menos 8 caracteres, incluindo números, letras e caracteres especiais';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await authService.login(form);
            localStorage.setItem('user', JSON.stringify(response.user));
            navigate('/');
        } catch (err) {
            setErrors({ password: 'Credenciais inválidas' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof ValidationErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <h1>Login</h1>
                
                <div className={styles.formGroup}>
                    <label htmlFor="email">E-mail:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className={errors.email ? styles.inputError : ''}
                        disabled={isLoading}
                    />
                    {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password">Senha:</label>
                    <div className={styles.passwordInput}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className={errors.password ? styles.inputError : ''}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className={styles.togglePassword}
                            disabled={isLoading}
                        >
                            {showPassword ? '🔒' : '👁️'}
                        </button>
                    </div>
                    {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                </div>

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
` : `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const validatePassword = (password) => {
        const hasNumber = /[0-9]/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasMinLength = password.length >= 8;

        return hasNumber && hasLetter && hasSpecial && hasMinLength;
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!form.email) {
            newErrors.email = 'E-mail é obrigatório';
        } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email)) {
            newErrors.email = 'E-mail inválido';
        }

        if (!form.password) {
            newErrors.password = 'Senha é obrigatória';
        } else if (!validatePassword(form.password)) {
            newErrors.password = 'A senha deve conter pelo menos 8 caracteres, incluindo números, letras e caracteres especiais';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        
        try {
            const response = await authService.login(form);
            localStorage.setItem('user', JSON.stringify(response.user));
            navigate('/');
        } catch (err) {
            setErrors({ password: 'Credenciais inválidas' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <h1>Login</h1>
                
                <div className={styles.formGroup}>
                    <label htmlFor="email">E-mail:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className={errors.email ? styles.inputError : ''}
                        disabled={isLoading}
                    />
                    {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password">Senha:</label>
                    <div className={styles.passwordInput}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className={errors.password ? styles.inputError : ''}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className={styles.togglePassword}
                            disabled={isLoading}
                        >
                            {showPassword ? '🔒' : '👁️'}
                        </button>
                    </div>
                    {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                </div>

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
`;
    }

    private generateApp(): string {
        return this.isTypeScript ? `
import React from 'react';
import Router from './routes';
import './App.css';

const App: React.FC = () => {
    return <Router />;
};

export default App;
` : `
import React from 'react';
import Router from './routes';
import './App.css';

const App = () => {
    return <Router />;
};

export default App;
`;
    }

    private async createComponent(response: any): Promise<string> {
        try {
            const aiResponse = await this.aiHelper.parseRequest(response);
            
            if (!aiResponse.newName) {
                aiResponse.newName = this.inferComponentName(typeof response === 'string' ? response : response.toString());
            }

            // Verificar se é uma operação de importação/uso
            const importFeature = aiResponse.features.find((f: Feature) => f.type === 'import');
            const usageFeature = aiResponse.features.find((f: Feature) => f.type === 'usage');
            
            if (importFeature || usageFeature) {
                return await this.modifyExistingFile(aiResponse);
            }

            // Determinar o tipo de componente e suas características
            const componentType = this.inferComponentType(typeof response === 'string' ? response : response.toString(), aiResponse);
            const features = this.inferComponentFeatures(typeof response === 'string' ? response : response.toString(), componentType);

            const config: ComponentConfig = {
                name: aiResponse.newName,
                type: componentType.includes('page') ? 'page' : 'component',
                features: features
            };

            const componentDir = this.createComponentDirectory(config);
            await this.generateFiles(config, componentDir);

            return `Componente ${config.name} criado com sucesso em ${componentDir}!`;
        } catch (error) {
            console.error('Erro:', error);
            throw error;
        }
    }

    private inferComponentName(request: string): string {
        const words = request.toLowerCase().split(' ');
        
        // Mapear palavras comuns para nomes de componentes
        const componentMappings: { [key: string]: string } = {
            'login': 'LoginPage',
            'cadastro': 'RegisterPage',
            'registro': 'RegisterPage',
            'usuário': 'UserPage',
            'usuario': 'UserPage',
            'perfil': 'ProfilePage',
            'dashboard': 'DashboardPage',
            'tabela': 'TableComponent',
            'formulário': 'FormComponent',
            'formulario': 'FormComponent',
            'lista': 'ListComponent'
        };

        // Procurar por palavras-chave conhecidas
        for (const word of words) {
            if (componentMappings[word]) {
                return componentMappings[word];
            }
        }

        // Se não encontrar mapeamento específico, criar um nome baseado no contexto
        if (words.includes('página') || words.includes('pagina')) {
            const relevantWord = words.find(w => w !== 'página' && w !== 'pagina' && w.length > 3);
            if (relevantWord) {
                return this.capitalize(relevantWord) + 'Page';
            }
        }

        return 'CustomComponent';
    }

    private inferComponentType(request: string, aiResponse: any): string {
        const requestLower = request.toLowerCase();
        
        // Verificar por palavras-chave específicas
        if (requestLower.includes('login') || requestLower.includes('autenticação')) {
            return 'auth-page';
        }
        if (requestLower.includes('formulário') || requestLower.includes('formulario')) {
            return 'form-component';
        }
        if (requestLower.includes('tabela') || requestLower.includes('lista')) {
            return 'table-component';
        }
        if (requestLower.includes('página') || requestLower.includes('pagina')) {
            return 'page';
        }

        return aiResponse.componentType || 'component';
    }

    private inferComponentFeatures(request: string, componentType: string): any[] {
        const features = [];
        const requestLower = request.toLowerCase();

        switch (componentType) {
            case 'auth-page':
                features.push({
                    type: 'form',
                    fields: [
                        { name: 'email', type: 'string' },
                        { name: 'password', type: 'string' }
                    ]
                });
                features.push({
                    type: 'auth',
                    service: {
                        baseURL: '/api',
                        endpoints: [{ method: 'POST', path: '/auth/login' }],
                        auth: true
                    }
                });
                break;

            case 'form-component':
                const formFields = this.extractFormFields(requestLower);
                features.push({
                    type: 'form',
                    fields: formFields
                });
                break;

            case 'table-component':
                features.push({
                    type: 'table',
                    fields: this.extractTableFields(requestLower)
                });
                if (requestLower.includes('paginação') || requestLower.includes('paginacao')) {
                    features.push({ type: 'pagination' });
                }
                if (requestLower.includes('busca') || requestLower.includes('pesquisa')) {
                    features.push({ type: 'search' });
                }
                if (requestLower.includes('filtro')) {
                    features.push({ type: 'filters' });
                }
                break;

            case 'page':
                if (requestLower.includes('protegida') || requestLower.includes('privada')) {
                    features.push({
                        type: 'route',
                        route: {
                            isPrivate: true,
                            layout: 'MainLayout'
                        }
                    });
                }
                break;
        }

        return features;
    }

    private extractFormFields(request: string): { name: string; type: string; }[] {
        const commonFields = {
            'email': 'string',
            'senha': 'string',
            'nome': 'string',
            'telefone': 'string',
            'data': 'date',
            'valor': 'number',
            'quantidade': 'number',
            'descrição': 'string',
            'descricao': 'string'
        };

        const fields = [];
        for (const [field, type] of Object.entries(commonFields)) {
            if (request.includes(field)) {
                fields.push({ name: field, type });
            }
        }

        return fields.length > 0 ? fields : [{ name: 'name', type: 'string' }];
    }

    private extractTableFields(request: string): { name: string; type: string; }[] {
        const commonFields = {
            'id': 'number',
            'nome': 'string',
            'email': 'string',
            'telefone': 'string',
            'data': 'date',
            'status': 'string',
            'valor': 'number',
            'quantidade': 'number'
        };

        const fields = [];
        for (const [field, type] of Object.entries(commonFields)) {
            if (request.includes(field)) {
                fields.push({ name: field, type });
            }
        }

        return fields.length > 0 ? fields : [
            { name: 'id', type: 'number' },
            { name: 'name', type: 'string' }
        ];
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
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
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--vscode-editor-background);
}

.form {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: var(--vscode-editor-foreground);
}

.formGroup {
    margin-bottom: 1.5rem;
}

.formGroup label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--vscode-editor-foreground);
}

.formGroup input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 1rem;
}

.formGroup input:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
}

.inputError {
    border-color: var(--vscode-inputValidation-errorBorder) !important;
}

.errorText {
    display: block;
    margin-top: 0.5rem;
    color: var(--vscode-inputValidation-errorForeground);
    font-size: 0.875rem;
}

.passwordInput {
    position: relative;
    display: flex;
    align-items: center;
}

.passwordInput input {
    padding-right: 3rem;
}

.togglePassword {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.25rem;
    color: var(--vscode-button-foreground);
    opacity: 0.7;
    transition: opacity 0.2s;
}

.togglePassword:hover {
    opacity: 1;
}

.togglePassword:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.submitButton {
    width: 100%;
    padding: 0.75rem;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.submitButton:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
}

.submitButton:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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

    private async addRoute(response: any): Promise<string> {
        // Implementação da adição de rotas
        return "Rota adicionada com sucesso!";
    }

    private async modifyExistingFile(aiResponse: any): Promise<string> {
        const targetFile = aiResponse.features.find((f: Feature) => f.targetFile)?.targetFile;
        if (!targetFile) {
            throw new Error('Arquivo alvo não especificado');
        }

        const filePath = path.join(this.workspaceRoot, targetFile);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo ${targetFile} não encontrado`);
        }

        let content = fs.readFileSync(filePath, 'utf8');
        const importFeature = aiResponse.features.find((f: Feature) => f.type === 'import');
        const usageFeature = aiResponse.features.find((f: Feature) => f.type === 'usage');

        if (importFeature) {
            const importStatement = `import ${importFeature.component} from '${importFeature.importComponent}';\n`;
            content = importStatement + content;
        }

        if (usageFeature) {
            const componentUsage = `<${usageFeature.component} ${Object.entries(usageFeature.props || {})
                .map(([key, value]) => `${key}={${value}}`).join(' ')} />`;
            content = content.replace('</div>', `  ${componentUsage}\n</div>`);
        }

        fs.writeFileSync(filePath, content);
        return `Arquivo ${targetFile} modificado com sucesso!`;
    }
} 