export const formStyles = `
.form {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.formGroup {
    margin-bottom: 1.5rem;
}

.formGroup label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
}

.formGroup input {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    transition: border-color 0.2s ease;
}

.formGroup input:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.formGroup input.inputError {
    border-color: #dc3545;
}

.formGroup input.inputError:focus {
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
}

.errorText {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #dc3545;
}

.submitButton {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
    background-color: #4a90e2;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.submitButton:hover {
    background-color: #357abd;
}

.submitButton:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.4);
}

.submitButton:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .form {
        padding: 1.5rem;
    }
}
`; 