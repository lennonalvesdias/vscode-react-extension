export const loginPageTemplate = {
    typescript: `import React, { useState } from 'react';
import styles from './{{name}}.module.css';
import { AuthService } from '../../services/authService';

interface {{name}}Props {
    onSuccess: () => void;
    onError: (error: Error) => void;
}

interface FormData {
    email: string;
    password: string;
}

const {{name}} = (props: {{name}}Props) => {
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: ''
    });

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

export default {{name}};`,
    javascript: `import React, { useState } from 'react';
import styles from './{{name}}.module.css';
import { AuthService } from '../../services/authService';

const {{name}} = (props) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e) => {
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

export default {{name}};`
}; 