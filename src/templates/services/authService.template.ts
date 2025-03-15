export const authServiceTemplate = `{{#if isTypeScript}}
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