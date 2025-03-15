export const tableStyles = `.container {
    width: 100%;
    overflow-x: auto;
}

.table {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
}

.header {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 2px solid var(--vscode-input-border);
    cursor: pointer;
    user-select: none;
}

.header:hover {
    background-color: var(--vscode-list-hoverBackground);
}

.cell {
    padding: 0.75rem;
    border-bottom: 1px solid var(--vscode-input-border);
}

.sortIcon {
    margin-left: 0.5rem;
    font-size: 0.8em;
}

tr:hover {
    background-color: var(--vscode-list-hoverBackground);
} 