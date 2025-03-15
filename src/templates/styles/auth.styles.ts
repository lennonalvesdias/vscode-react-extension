export const authStyles = `.container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--vscode-editor-background);
}

.form {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: var(--vscode-editor-foreground);
}

.formGroup {
    margin-bottom: 1.5rem;
}

.formGroup label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--vscode-editor-foreground);
}

.formGroup input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 1rem;
}

.formGroup input:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
}

.inputError {
    border-color: var(--vscode-inputValidation-errorBorder) !important;
}

.errorText {
    display: block;
    margin-top: 0.5rem;
    color: var(--vscode-inputValidation-errorForeground);
    font-size: 0.875rem;
}

.passwordInput {
    position: relative;
    display: flex;
    align-items: center;
}

.passwordInput input {
    padding-right: 3rem;
}

.togglePassword {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.25rem;
    color: var(--vscode-button-foreground);
    opacity: 0.7;
    transition: opacity 0.2s;
}

.togglePassword:hover {
    opacity: 1;
}

.togglePassword:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.submitButton {
    width: 100%;
    padding: 0.75rem;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.submitButton:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
}

.submitButton:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}
`; 