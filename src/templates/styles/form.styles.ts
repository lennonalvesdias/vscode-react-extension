export const formStyles = `.form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
    margin: 0 auto;
    padding: 1rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.label {
    color: var(--vscode-editor-foreground);
    font-weight: 500;
}

.required {
    color: var(--vscode-errorForeground);
    margin-left: 0.25rem;
}

.input {
    padding: 0.5rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
}

.input:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
}

.error {
    color: var(--vscode-errorForeground);
    font-size: 0.875rem;
}

.button {
    padding: 0.5rem 1rem;
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 1rem;
}

.button:hover {
    background-color: var(--vscode-button-hoverBackground);
}

@media (max-width: 768px) {
    .form {
        padding: 1.5rem;
    }
}
`; 