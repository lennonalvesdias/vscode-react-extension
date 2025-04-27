import * as React from 'react';
import './ChatInterface.css';
// Importações para renderização de Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Prism from 'prismjs';
import LoadingDots from './LoadingDots';

// Carregar linguagens para highlight de código
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  id?: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  availableModels: string[];
  selectedModel: string;
  hasApiKey: boolean;
}

// Componente para o botão de cópia de código
const CopyButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button className="copy-button" onClick={handleCopy}>
        <svg className="copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
      {copied && <span className="copied-message">Copiado!</span>}
    </>
  );
};

// Componente CodeBlock com suporte a highlight e cópia
const CodeBlock: React.FC<{ language: string, value: string }> = ({ language, value }) => {
  const codeRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [value, language]);

  // Normaliza o language name
  const getLanguageName = (lang: string) => {
    // Remove o prefixo "language-" se existir
    const normalizedLang = lang.replace(/^language-/, '');

    // Mapeamento de aliases comuns
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'sh': 'bash',
      'shell': 'bash',
      'yml': 'yaml'
    };

    return languageMap[normalizedLang] || normalizedLang;
  };

  const displayLanguage = getLanguageName(language || 'text');

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-language">{displayLanguage}</span>
        <CopyButton code={value} />
      </div>
      <pre className={`language-${displayLanguage}`}>
        <code ref={codeRef} className={`language-${displayLanguage}`}>
          {value}
        </code>
      </pre>
    </div>
  );
};

// Declaração do tipo para a API do VS Code
declare function acquireVsCodeApi(): {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

// Inicializamos a API do VS Code uma única vez fora do componente
let vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;
try {
  console.log('Inicializando VS Code API globalmente');
  if (typeof acquireVsCodeApi === 'function') {
    vscodeApi = acquireVsCodeApi();
    console.log('VS Code API inicializada com sucesso:', !!vscodeApi);
  } else {
    console.error('Função acquireVsCodeApi não disponível');
  }
} catch (err) {
  console.error('Erro ao inicializar VS Code API:', err);
}

// Função de fallback para enviar mensagens ao VS Code
function safePostMessage(message: any): boolean {
  try {
    if (vscodeApi) {
      vscodeApi.postMessage(message);
      return true;
    }
    // Fallback para window.parent se vscodeApi não estiver disponível
    else if (window.parent !== window) {
      window.parent.postMessage(message, '*');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return false;
  }
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isProcessing,
  availableModels,
  selectedModel,
  hasApiKey
}) => {
  console.log('ChatInterface renderizando com:', {
    messageCount: messages.length,
    isProcessing,
    modelCount: availableModels.length,
    selectedModel,
    hasApiKey
  });

  const [input, setInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Efeito para rolar para o final das mensagens
  React.useEffect(() => {
    // Garantir que a rolagem aconteça após a renderização
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Ajustar altura do textarea automaticamente
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Enviar mensagem ao VS Code
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) { return; }

    const success = safePostMessage({
      command: 'sendMessage',
      text: input.trim()
    });

    if (success) {
      setInput('');
    }
  };

  // Lidar com tecla Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Mudar modelo de IA
  const handleChangeModel = (e: React.ChangeEvent<HTMLSelectElement>) => {
    safePostMessage({
      command: 'changeModel',
      model: e.target.value
    });
  };

  // Limpar conversa
  const handleClearChat = () => {
    safePostMessage({
      command: 'clearChat'
    });
  };

  // Formatar timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-interface">
      {/* Cabeçalho */}
      <header className="chat-header">
        <div className="header-content">
          <div className="model-selector">
            <span>Modelo:</span>
            <select value={selectedModel} onChange={handleChangeModel} aria-label="Selecionar modelo de IA">
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <button className="clear-button" onClick={handleClearChat} type="button">
            Limpar conversa
          </button>
        </div>
      </header>

      {/* Área de mensagens */}
      <main className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-state">
            {!hasApiKey ? (
              <p>Para começar, configure as credenciais nas Configurações.</p>
            ) : (
              <p>Bem-vindo! Faça sua pergunta para o assistente de IA.</p>
            )}
          </div>
        ) : (
          // Renderizar mensagens como uma lista
          <div className="messages-list">
            {messages.map((message, index) => {
              const isUser = message.sender === 'user';
              const messageClass = isUser ? 'message-user' : 'message-assistant';
              const label = isUser ? 'Você' : 'Assistente';

              return (
                <div key={message.id || index} className={`message ${messageClass}`}>
                  <div className="message-header">
                    <span>{label}</span>
                    {message.timestamp && (
                      <span className="message-timestamp">
                        {formatTime(new Date(message.timestamp))}
                      </span>
                    )}
                  </div>
                  <div className={`message-content ${!isUser ? 'markdown-content' : ''}`}>
                    {isUser ? (
                      <div>{message.text}</div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          // Renderização especial apenas para blocos de código
                          code: ({ node, inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');

                            if (inline) {
                              return (
                                <code className="inline-code" {...props}>
                                  {children}
                                </code>
                              );
                            }

                            const language = match ? match[1] : '';
                            const code = String(children).replace(/\n$/, '');

                            return <CodeBlock language={language} value={code} />;
                          },
                          // Outros componentes básicos para garantir formatação consistente
                          p: ({ children }) => <p>{children}</p>,
                          h1: ({ children }) => <h1>{children}</h1>,
                          h2: ({ children }) => <h2>{children}</h2>,
                          h3: ({ children }) => <h3>{children}</h3>,
                          ul: ({ children }) => <ul>{children}</ul>,
                          ol: ({ children }) => <ol>{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          blockquote: ({ children }) => <blockquote>{children}</blockquote>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                          strong: ({ children }) => <strong>{children}</strong>,
                          em: ({ children }) => <em>{children}</em>,
                          table: ({ children }) => <table>{children}</table>,
                          tr: ({ children }) => <tr>{children}</tr>,
                          th: ({ children }) => <th>{children}</th>,
                          td: ({ children }) => <td>{children}</td>
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Indicador de digitação */}
        {isProcessing && (
          <div className="message message-assistant">
            <div className="message-header">
              <span>Assistente</span>
            </div>
            <div className="message-content loading-animation">
              <LoadingDots size="medium" color="currentColor" />
            </div>
          </div>
        )}

        {/* Elemento de referência para rolagem */}
        <div ref={messagesEndRef} />
      </main>

      {/* Área de entrada */}
      <footer className="input-area">
        <form className="input-form" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isProcessing}
            rows={1}
          />
          <button
            className="send-button"
            type="submit"
            disabled={isProcessing}
            aria-label="Enviar mensagem"
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  );
};
