export const tableTemplate = {
    typescript: `import React, { useState, useEffect } from 'react';
import styles from './{{name}}.module.css';

interface {{name}}Props {
    data: Array<Record<string, any>>;
    columns: Array<{
        key: string;
        label: string;
    }>;
    onSort?: (key: string) => void;
}

const {{name}} = (props: {{name}}Props) => {
    const [sortKey, setSortKey] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const handleSort = (key: string) => {
        if (props.onSort) {
            const newDirection = key === sortKey && sortDirection === 'asc' ? 'desc' : 'asc';
            setSortDirection(newDirection);
            setSortKey(key);
            props.onSort(key);
        }
    };

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {props.columns.map((column) => (
                            <th
                                key={column.key}
                                onClick={() => handleSort(column.key)}
                                className={styles.header}
                            >
                                {column.label}
                                {sortKey === column.key && (
                                    <span className={styles.sortIcon}>
                                        {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, index) => (
                        <tr key={index}>
                            {props.columns.map((column) => (
                                <td key={column.key} className={styles.cell}>
                                    {row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default {{name}};`,
    javascript: `import React, { useState, useEffect } from 'react';
import styles from './{{name}}.module.css';

const {{name}} = (props) => {
    const [sortKey, setSortKey] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const handleSort = (key) => {
        if (props.onSort) {
            const newDirection = key === sortKey && sortDirection === 'asc' ? 'desc' : 'asc';
            setSortDirection(newDirection);
            setSortKey(key);
            props.onSort(key);
        }
    };

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {props.columns.map((column) => (
                            <th
                                key={column.key}
                                onClick={() => handleSort(column.key)}
                                className={styles.header}
                            >
                                {column.label}
                                {sortKey === column.key && (
                                    <span className={styles.sortIcon}>
                                        {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, index) => (
                        <tr key={index}>
                            {props.columns.map((column) => (
                                <td key={column.key} className={styles.cell}>
                                    {row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default {{name}};`
}; 