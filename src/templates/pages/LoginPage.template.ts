export const loginPageTemplate = {
    typescript: `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
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

export default LoginPage;`,

    javascript: `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
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

export default LoginPage;`
}; 