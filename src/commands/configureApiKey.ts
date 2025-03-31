import * as vscode from 'vscode';

// Este comando agora é registrado diretamente em src/extension.ts
// Mantemos esta função apenas para compatibilidade com código existente
export function registerConfigureApiKeyCommand(_context: vscode.ExtensionContext) {
  // Não precisa implementar nada aqui pois o comando já está registrado em extension.ts
  console.log('Command psCopilot.configureApiKey already registered in extension.ts');
}
