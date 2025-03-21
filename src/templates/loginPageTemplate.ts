import { DesignOutput } from '../agents/designAgent';

export function loginPageTemplate(design: DesignOutput): string {
    return `
import React, { useState } from 'react';
import axios from 'axios';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    
    const validatePassword = (pwd: string) => {
        const pattern = new RegExp('${design.validations.password.pattern}');
        return pwd.length >= ${design.validations.password.minLength} && pattern.test(pwd);
    };
    
    const handleLogin = async () => {
        if (!validatePassword(password)) {
            setError('Senha inválida. Certifique-se que tenha pelo menos 8 caracteres, um número, uma letra e um caractere especial.');
            return;
        }
        try {
            const response = await axios.post('${design.service.apiEndpoint}', { username, password });
            if (response.data.authenticated) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                // Redirecionamento ou atualização de estado conforme necessário
            } else {
                setError('Usuário ou senha inválidos.');
            }
        } catch (err) {
            setError('Erro ao conectar com o serviço de autenticação.');
        }
    };
    
    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Login</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={{ marginBottom: '10px' }}>
                <label>Usuário:</label>
                <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Usuário" 
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
                />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label>Senha:</label>
                <div style={{ position: 'relative' }}>
                    <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Senha" 
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
                    />
                    <button 
                        onClick={() => setShowPassword(!showPassword)} 
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                        {showPassword ? 'Ocultar' : 'Exibir'}
                    </button>
                </div>
            </div>
            <button onClick={handleLogin} style={{ padding: '10px 20px' }}>Login</button>
        </div>
    );
};

export default LoginPage;
    `;
}
