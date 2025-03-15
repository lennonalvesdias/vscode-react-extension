export const tableTemplate = {
    typescript: `import React, { useState, useMemo } from 'react';
import styles from './{{name}}.module.css';

interface TableItem {
    {{#each fields}}
    {{name}}: {{type}};
    {{/each}}
}

interface {{name}}Props {
    data: TableItem[];
    onEdit?: (item: TableItem) => void;
    onDelete?: (id: number) => void;
}

interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

interface Filters {
    [key: string]: any;
}

const {{name}}: React.FC<{{name}}Props> = ({ data = [], onEdit, onDelete }) => {
    {{#if hasPagination}}
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    {{/if}}

    {{#if hasSearch}}
    const [searchTerm, setSearchTerm] = useState('');
    {{/if}}

    {{#if hasFilters}}
    const [filters, setFilters] = useState<Filters>({});
    {{/if}}

    {{#if hasSorting}}
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: '', direction: 'asc' });
    {{/if}}

    {{#if hasPagination}}
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    {{/if}}

    {{#if hasSearch}}
    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    {{/if}}

    {{#if hasFilters}}
    const handleFilterChange = (field: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setPage(0);
    };
    {{/if}}

    {{#if hasSorting}}
    const handleSort = (field: string) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    {{/if}}

    {{#if hasFilters}}
    const filterData = (data: TableItem[]) => {
        return data.filter(item => {
            let matchesSearch = true;
            let matchesFilters = true;
            
            {{#if hasSearch}}
            if (searchTerm) {
                matchesSearch = Object.values(item)
                    .some(value => 
                        String(value).toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    );
            }
            {{/if}}
            
            if (Object.keys(filters).length) {
                matchesFilters = Object.entries(filters).every(([field, value]) => {
                    if (!value) return true;
                    return String(item[field as keyof TableItem]).toLowerCase()
                        .includes(String(value).toLowerCase());
                });
            }
            
            return matchesSearch && matchesFilters;
        });
    };
    {{/if}}

    const filteredData = useMemo(() => {
        let processed = [...data];
        
        {{#if hasFilters}}
        processed = filterData(processed);
        {{/if}}
        
        {{#if hasSorting}}
        if (sortConfig.field) {
            processed.sort((a, b) => {
                if (a[sortConfig.field as keyof TableItem] < b[sortConfig.field as keyof TableItem]) 
                    return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.field as keyof TableItem] > b[sortConfig.field as keyof TableItem]) 
                    return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        {{/if}}
        
        return processed;
    }, [data{{#if hasSearch}}, searchTerm{{/if}}{{#if hasFilters}}, filters{{/if}}{{#if hasSorting}}, sortConfig{{/if}}]);

    return (
        <div className={styles.container}>
            {{#if hasSearch}}
            <div className={styles.toolbar}>
                <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className={styles.searchInput}
                />
            </div>
            {{/if}}

            <table className={styles.table}>
                <thead>
                    <tr>
                        {{#each fields}}
                        <th>
                            <div className={styles.headerCell}>
                                {{name}}
                                {{#if ../hasSorting}}
                                <button
                                    onClick={() => handleSort('{{name}}')}
                                    className={styles.sortButton}
                                >
                                    ↕️
                                </button>
                                {{/if}}
                            </div>
                        </th>
                        {{/each}}
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData
                        {{#if hasPagination}}
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        {{/if}}
                        .map((item) => (
                        <tr key={item.id}>
                            {{#each fields}}
                            <td>{item.{{name}}}</td>
                            {{/each}}
                            <td>
                                <div className={styles.actions}>
                                    <button
                                        onClick={() => onEdit?.(item)}
                                        className={styles.editButton}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(item.id)}
                                        className={styles.deleteButton}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {{#if hasPagination}}
            <div className={styles.pagination}>
                <span>
                    Linhas por página:
                    <select
                        value={rowsPerPage}
                        onChange={handleChangeRowsPerPage}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </span>
                <div className={styles.paginationControls}>
                    <button
                        onClick={() => handleChangePage(null, page - 1)}
                        disabled={page === 0}
                    >
                        ←
                    </button>
                    <span>
                        {page + 1} de {Math.ceil(filteredData.length / rowsPerPage)}
                    </span>
                    <button
                        onClick={() => handleChangePage(null, page + 1)}
                        disabled={page >= Math.ceil(filteredData.length / rowsPerPage) - 1}
                    >
                        →
                    </button>
                </div>
            </div>
            {{/if}}
        </div>
    );
};

export default {{name}};`,
    javascript: `import React, { useState, useMemo } from 'react';
import styles from './{{name}}.module.css';

const {{name}} = ({ data = [], onEdit, onDelete }) => {
    {{#if hasPagination}}
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    {{/if}}

    {{#if hasSearch}}
    const [searchTerm, setSearchTerm] = useState('');
    {{/if}}

    {{#if hasFilters}}
    const [filters, setFilters] = useState({});
    {{/if}}

    {{#if hasSorting}}
    const [sortConfig, setSortConfig] = useState({ field: '', direction: 'asc' });
    {{/if}}

    {{#if hasPagination}}
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    {{/if}}

    {{#if hasSearch}}
    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    {{/if}}

    {{#if hasFilters}}
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setPage(0);
    };
    {{/if}}

    {{#if hasSorting}}
    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    {{/if}}

    {{#if hasFilters}}
    const filterData = (data) => {
        return data.filter(item => {
            let matchesSearch = true;
            let matchesFilters = true;
            
            {{#if hasSearch}}
            if (searchTerm) {
                matchesSearch = Object.values(item)
                    .some(value => 
                        String(value).toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    );
            }
            {{/if}}
            
            if (Object.keys(filters).length) {
                matchesFilters = Object.entries(filters).every(([field, value]) => {
                    if (!value) return true;
                    return String(item[field]).toLowerCase()
                        .includes(String(value).toLowerCase());
                });
            }
            
            return matchesSearch && matchesFilters;
        });
    };
    {{/if}}

    const filteredData = useMemo(() => {
        let processed = [...data];
        
        {{#if hasFilters}}
        processed = filterData(processed);
        {{/if}}
        
        {{#if hasSorting}}
        if (sortConfig.field) {
            processed.sort((a, b) => {
                if (a[sortConfig.field] < b[sortConfig.field]) 
                    return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.field] > b[sortConfig.field]) 
                    return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        {{/if}}
        
        return processed;
    }, [data{{#if hasSearch}}, searchTerm{{/if}}{{#if hasFilters}}, filters{{/if}}{{#if hasSorting}}, sortConfig{{/if}}]);

    return (
        <div className={styles.container}>
            {{#if hasSearch}}
            <div className={styles.toolbar}>
                <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className={styles.searchInput}
                />
            </div>
            {{/if}}

            <table className={styles.table}>
                <thead>
                    <tr>
                        {{#each fields}}
                        <th>
                            <div className={styles.headerCell}>
                                {{name}}
                                {{#if ../hasSorting}}
                                <button
                                    onClick={() => handleSort('{{name}}')}
                                    className={styles.sortButton}
                                >
                                    ↕️
                                </button>
                                {{/if}}
                            </div>
                        </th>
                        {{/each}}
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData
                        {{#if hasPagination}}
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        {{/if}}
                        .map((item) => (
                        <tr key={item.id}>
                            {{#each fields}}
                            <td>{item.{{name}}}</td>
                            {{/each}}
                            <td>
                                <div className={styles.actions}>
                                    <button
                                        onClick={() => onEdit?.(item)}
                                        className={styles.editButton}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(item.id)}
                                        className={styles.deleteButton}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {{#if hasPagination}}
            <div className={styles.pagination}>
                <span>
                    Linhas por página:
                    <select
                        value={rowsPerPage}
                        onChange={handleChangeRowsPerPage}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </span>
                <div className={styles.paginationControls}>
                    <button
                        onClick={() => handleChangePage(null, page - 1)}
                        disabled={page === 0}
                    >
                        ←
                    </button>
                    <span>
                        {page + 1} de {Math.ceil(filteredData.length / rowsPerPage)}
                    </span>
                    <button
                        onClick={() => handleChangePage(null, page + 1)}
                        disabled={page >= Math.ceil(filteredData.length / rowsPerPage) - 1}
                    >
                        →
                    </button>
                </div>
            </div>
            {{/if}}
        </div>
    );
};

export default {{name}};`
}; 