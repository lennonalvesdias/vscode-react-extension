export const tableStyles = `.container {
    padding: 1rem;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
}

.searchInput {
    flex: 1;
    max-width: 300px;
    padding: 0.5rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
}

.searchInput:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
}

.table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
}

.table th,
.table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--vscode-input-border);
}

.table th {
    background: var(--vscode-editor-background);
    font-weight: bold;
}

.headerCell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sortButton {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
    color: var(--vscode-button-foreground);
    opacity: 0.7;
    transition: opacity 0.2s;
}

.sortButton:hover {
    opacity: 1;
}

.actions {
    display: flex;
    gap: 0.5rem;
}

.editButton,
.deleteButton {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.25rem;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.editButton {
    color: var(--vscode-button-background);
}

.deleteButton {
    color: var(--vscode-errorForeground);
}

.editButton:hover,
.deleteButton:hover {
    opacity: 1;
}

.pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--vscode-input-border);
}

.pagination select {
    margin-left: 0.5rem;
    padding: 0.25rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
}

.paginationControls {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.paginationControls button {
    background: none;
    border: 1px solid var(--vscode-button-background);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    color: var(--vscode-button-foreground);
    cursor: pointer;
    transition: background-color 0.2s;
}

.paginationControls button:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
}

.paginationControls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: var(--vscode-input-border);
} 