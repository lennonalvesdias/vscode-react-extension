export const formTemplate = {
    typescript: `import React, { useState } from 'react';
import styles from './{{name}}.module.css';

interface FormData {
    {{#each fields}}
    {{name}}: {{type}};
    {{/each}}
}

interface ValidationErrors {
    {{#each fields}}
    {{name}}?: string;
    {{/each}}
}

interface {{name}}Props {
    initialData?: FormData;
    onSubmit: (data: FormData) => void;
}

const {{name}}: React.FC<{{name}}Props> = ({ initialData, onSubmit }) => {
    const [form, setForm] = useState<FormData>(initialData || {
        {{#each fields}}
        {{name}}: {{#if (eq type 'string')}}''{{else if (eq type 'number')}}0{{else if (eq type 'boolean')}}false{{else}}null{{/if}},
        {{/each}}
    });

    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};
        let isValid = true;

        {{#each fields}}
        {{#if validation}}
        // Validar {{name}}
        {{#each validation}}
        {{#if (eq this 'required')}}
        if (!form.{{../name}}) {
            newErrors.{{../name}} = '{{../name}} é obrigatório';
            isValid = false;
        }
        {{/if}}
        {{#if (eq this 'email')}}
        if (form.{{../name}} && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.{{../name}})) {
            newErrors.{{../name}} = 'E-mail inválido';
            isValid = false;
        }
        {{/if}}
        {{#if (startsWith this 'minLength:')}}
        if (form.{{../name}} && form.{{../name}}.length < {{slice this 9}}) {
            newErrors.{{../name}} = '{{../name}} deve ter pelo menos {{slice this 9}} caracteres';
            isValid = false;
        }
        {{/if}}
        {{#if (startsWith this 'min:')}}
        if (form.{{../name}} < {{slice this 4}}) {
            newErrors.{{../name}} = '{{../name}} deve ser maior que {{slice this 4}}';
            isValid = false;
        }
        {{/if}}
        {{#if (eq this 'phone')}}
        if (form.{{../name}} && !/^\(\d{2}\) \d{5}-\d{4}$/.test(form.{{../name}})) {
            newErrors.{{../name}} = 'Telefone inválido';
            isValid = false;
        }
        {{/if}}
        {{/each}}
        {{/if}}
        {{/each}}

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        
        try {
            await onSubmit(form);
        } catch (err) {
            console.error('Erro ao enviar formulário:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
        if (errors[name as keyof ValidationErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {{#each fields}}
            <div className={styles.formGroup}>
                <label htmlFor="{{name}}">{{name}}:</label>
                <input
                    type="{{#if (eq type 'number')}}}number{{else if (eq type 'email')}}email{{else if (eq type 'password')}}password{{else}}text{{/if}}"
                    id="{{name}}"
                    name="{{name}}"
                    value={form.{{name}}}
                    onChange={handleChange}
                    className={errors.{{name}} ? styles.inputError : ''}
                    disabled={isLoading}
                />
                {errors.{{name}} && <span className={styles.errorText}>{errors.{{name}}}</span>}
            </div>
            {{/each}}

            <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading}
            >
                {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
        </form>
    );
};

export default {{name}};`,
    javascript: `import React, { useState } from 'react';
import styles from './{{name}}.module.css';

const {{name}} = ({ initialData, onSubmit }) => {
    const [form, setForm] = useState(initialData || {
        {{#each fields}}
        {{name}}: {{#if (eq type 'string')}}''{{else if (eq type 'number')}}0{{else if (eq type 'boolean')}}false{{else}}null{{/if}},
        {{/each}}
    });

    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        {{#each fields}}
        {{#if validation}}
        // Validar {{name}}
        {{#each validation}}
        {{#if (eq this 'required')}}
        if (!form.{{../name}}) {
            newErrors.{{../name}} = '{{../name}} é obrigatório';
            isValid = false;
        }
        {{/if}}
        {{#if (eq this 'email')}}
        if (form.{{../name}} && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.{{../name}})) {
            newErrors.{{../name}} = 'E-mail inválido';
            isValid = false;
        }
        {{/if}}
        {{#if (startsWith this 'minLength:')}}
        if (form.{{../name}} && form.{{../name}}.length < {{slice this 9}}) {
            newErrors.{{../name}} = '{{../name}} deve ter pelo menos {{slice this 9}} caracteres';
            isValid = false;
        }
        {{/if}}
        {{#if (startsWith this 'min:')}}
        if (form.{{../name}} < {{slice this 4}}) {
            newErrors.{{../name}} = '{{../name}} deve ser maior que {{slice this 4}}';
            isValid = false;
        }
        {{/if}}
        {{#if (eq this 'phone')}}
        if (form.{{../name}} && !/^\(\d{2}\) \d{5}-\d{4}$/.test(form.{{../name}})) {
            newErrors.{{../name}} = 'Telefone inválido';
            isValid = false;
        }
        {{/if}}
        {{/each}}
        {{/if}}
        {{/each}}

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        
        try {
            await onSubmit(form);
        } catch (err) {
            console.error('Erro ao enviar formulário:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {{#each fields}}
            <div className={styles.formGroup}>
                <label htmlFor="{{name}}">{{name}}:</label>
                <input
                    type="{{#if (eq type 'number')}}}number{{else if (eq type 'email')}}email{{else if (eq type 'password')}}password{{else}}text{{/if}}"
                    id="{{name}}"
                    name="{{name}}"
                    value={form.{{name}}}
                    onChange={handleChange}
                    className={errors.{{name}} ? styles.inputError : ''}
                    disabled={isLoading}
                />
                {errors.{{name}} && <span className={styles.errorText}>{errors.{{name}}}</span>}
            </div>
            {{/each}}

            <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading}
            >
                {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
        </form>
    );
};

export default {{name}};`
}; 