/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';

// Mock do vscode
const vscode = {
  window: {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  Uri: {
    file: jest.fn(),
    joinPath: jest.fn(),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  ExtensionContext: jest.fn(),
  WebviewPanel: jest.fn(),
  WebviewView: jest.fn(),
  WebviewViewProvider: jest.fn(),
  Webview: jest.fn(),
};

jest.mock('vscode', () => vscode);

// Mock do ambiente
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_MODEL = 'gpt-4';
process.env.OPENAI_TEMPERATURE = '0.7';
process.env.OPENAI_MAX_TOKENS = '2000';
