export const formTemplate = {
    typescript: `import React, { useState } from 'react';
import styles from './{{name}}.module.css';

interface {{name}}Props {
    onSubmit: (data: Record<string, any>) => void;
    fields: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
    }>;
}

const {{name}} = (props: {{name}}Props) => {
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

export default {{name}};`,
    javascript: `import React, { useState } from 'react';
import styles from './{{name}}.module.css';

const {{name}} = (props) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const handleSubmit = (e) => {
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

    const handleChange = (name, value) => {
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

export default {{name}};`
}; 