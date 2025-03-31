import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';

describe('ChatInterface', () => {
  beforeEach(() => {
    (global as any).vscode = {
      postMessage: jest.fn()
    };
  });

  it('renders input and send button', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeInTheDocument();
    expect(screen.getByText('Enviar')).toBeInTheDocument();
  });

  it('sends message when form is submitted', () => {
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText('Digite sua mensagem...');
    const form = screen.getByRole('form');

    fireEvent.change(input, { target: { value: 'Olá, mundo!' } });
    fireEvent.submit(form);

    expect((global as any).vscode.postMessage).toHaveBeenCalledWith({
      command: 'sendMessage',
      text: 'Olá, mundo!'
    });
    expect(input).toHaveValue('');
  });

  it('shows loading state while sending message', () => {
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText('Digite sua mensagem...');
    const form = screen.getByRole('form');

    fireEvent.change(input, { target: { value: 'Olá, mundo!' } });
    fireEvent.submit(form);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(input).toBeDisabled();
  });
});
