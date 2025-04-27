import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ChatInterface } from './components/ChatInterface';
import './components/ChatInterface.css';
import './components/LoadingDots.css';

declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

declare global {
  interface Window {
    webviewData: {
      messages: Array<{
        text: string;
        sender: 'user' | 'assistant';
        timestamp: string;
      }>;
      isProcessing: boolean;
      availableModels: string[];
      selectedModel: string;
      hasApiKey: boolean;
    };
    scriptLoaded: boolean;
  }
}

// Função para verificar se a API do VS Code está disponível
function isVSCodeAPIAvailable(): boolean {
  try {
    return typeof acquireVsCodeApi === 'function';
  } catch (e) {
    console.error('Erro ao verificar API do VS Code:', e);
    return false;
  }
}

// Dados de fallback para o caso de window.webviewData não estar disponível
const fallbackData = {
  messages: [],
  isProcessing: false,
  availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
  selectedModel: 'gpt-4o',
  hasApiKey: false
};

// Inicialização simplificada
console.log('Webview script iniciado');

// Renderizar um erro de forma segura
function renderError(message: string) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; font-family: Arial, sans-serif; color: #d32f2f; background-color: #fdd; border: 1px solid #d32f2f; border-radius: 4px; margin: 20px;">${message}</div>`;
  }
}

// Garantir que os dados do webview estejam disponíveis
function getWebviewData() {
  try {
    console.log('Verificando dados do webview... Disponível:', !!window.webviewData);

    // Verificar se window.webviewData existe
    if (!window.webviewData) {
      console.warn('window.webviewData não encontrado, usando dados de fallback');

      // Tentar obter dados do elemento DOM como fallback
      const scriptDataElement = document.getElementById('webview-data');
      if (scriptDataElement) {
        try {
          const scriptDataContent = scriptDataElement.textContent || '{}';
          window.webviewData = JSON.parse(scriptDataContent);
          console.log('Dados recuperados do elemento DOM');
        } catch (parseError) {
          console.error('Erro ao analisar dados do elemento DOM:', parseError);
          window.webviewData = { ...fallbackData };
        }
      } else {
        window.webviewData = { ...fallbackData };
      }
    }

    // Verificar todos os campos necessários
    if (!window.webviewData.messages) { window.webviewData.messages = []; }
    if (window.webviewData.isProcessing === undefined) { window.webviewData.isProcessing = false; }
    if (!window.webviewData.availableModels) { window.webviewData.availableModels = fallbackData.availableModels; }
    if (!window.webviewData.selectedModel) { window.webviewData.selectedModel = fallbackData.selectedModel; }
    if (window.webviewData.hasApiKey === undefined) { window.webviewData.hasApiKey = false; }

    return window.webviewData;
  } catch (error) {
    console.error('Erro ao acessar dados do webview:', error);
    return { ...fallbackData };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado no webview');

  try {
    // Obtém o elemento root
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Elemento root não encontrado');
      document.body.innerHTML = '<div class="error-container">Erro: elemento root não encontrado</div>';
      return;
    }

    // Indicação visual de que o script está sendo executado
    rootElement.innerHTML = '<div class="loading"><div class="loading-spinner"></div><div>Inicializando interface...</div></div>';

    // Verifica disponibilidade da API VSCode
    if (!isVSCodeAPIAvailable()) {
      renderError('API do VS Code não está disponível. A extensão pode não estar rodando em um ambiente compatível.');
      return;
    }

    // Obter os dados do webview com tratamento de fallback
    const webviewData = getWebviewData();
    console.log('Dados recuperados:', {
      messageCount: webviewData.messages.length,
      models: webviewData.availableModels.length,
      selectedModel: webviewData.selectedModel
    });

    // Converte as strings de data para objetos Date
    const parsedMessages = webviewData.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp || new Date().toISOString())
    }));

    // Usar createRoot em vez de render para React 18+
    try {
      ReactDOM.render(
        <React.StrictMode>
          <ChatInterface
            messages={parsedMessages}
            isProcessing={webviewData.isProcessing}
            availableModels={webviewData.availableModels}
            selectedModel={webviewData.selectedModel}
            hasApiKey={webviewData.hasApiKey}
          />
        </React.StrictMode>,
        rootElement
      );
      console.log('ChatInterface renderizado com sucesso');

      // Marcar como carregado para o timeout
      if (typeof window !== 'undefined') {
        window.scriptLoaded = true;
      }
    } catch (reactError: unknown) {
      console.error('Erro ao renderizar React:', reactError);
      const errorMsg = reactError instanceof Error ? reactError.message : 'Erro desconhecido';
      renderError(`Erro ao renderizar React: ${errorMsg}`);
    }
  } catch (error: any) {
    console.error('Erro ao inicializar interface:', error);
    renderError(`Erro ao inicializar interface: ${error.message || 'Erro desconhecido'}`);
  }
});
