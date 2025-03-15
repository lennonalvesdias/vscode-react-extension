export const authServiceTemplate = {
    typescript: `
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

export default new AuthService();`,

    javascript: `
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

export default new AuthService();`
}; 