# PS Copilot

Assistente de desenvolvimento React com múltiplos agentes especializados.

## Funcionalidades

- Geração de código React (Componentes, Páginas, Hooks, Serviços) aderente ao Design System "Soma".
- Geração automática de testes (Jest/React Testing Library).
- Análise de conformidade com Design System e Acessibilidade.
- Interface de Chat integrada ao VS Code.
- Suporte a múltiplos provedores LLM (OpenAI Padrão, Azure OpenAI Service).

## Requisitos

- Visual Studio Code 1.60.0 ou superior
- Node.js (versão usada no desenvolvimento, ex: 18.x ou superior)
- NPM (versão usada no desenvolvimento, ex: 9.x ou superior)
- Credenciais para um provedor LLM:
  - **OpenAI:** API Key
  - **Azure OpenAI:** Endpoint do recurso, API Key e Nome do Deployment (modelo)

## Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/seu-usuario/ps-copilot.git # Substitua pela URL correta
    cd ps-copilot
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Compile o projeto:
    ```bash
    npm run compile
    ```
4.  Abra o projeto no VS Code e pressione `F5` para iniciar a extensão em modo de depuração.

## Configuração

A configuração das credenciais do LLM é feita **exclusivamente** através das Configurações do VS Code:

1.  Abra as Configurações: `Ctrl+,` (ou `Cmd+,` no Mac) ou Arquivo > Preferências > Configurações.
2.  Procure por "PS Copilot".
3.  Selecione o `Provider`: "openai" ou "azure".
4.  Preencha as credenciais correspondentes:
    - **Se Provider = "openai"**: Preencha `psCopilot.apiKey`.
    - **Se Provider = "azure"**: Preencha `psCopilot.azure.endpoint`, `psCopilot.azure.apiKey` e `psCopilot.azure.deploymentName`.
5.  (Opcional) Ajuste outras configurações como `model`, `temperature`, `maxTokens`, `timeout`.

## Uso

1.  **Abra o Chat:**
    - Clique no ícone do PS Copilot na barra de atividades.
    - Ou use o comando `PS Copilot: Abrir PS Copilot Chat` (Ctrl+Shift+P).
    - A view do chat também pode ser aberta no Explorer.
2.  **Interaja:** Digite suas solicitações na caixa de texto. Exemplos:
    - "Crie um componente de card para exibir informações de produto"
    - "Gere um hook para buscar dados da API de usuários"
    - "Implemente uma página de login com autenticação"
3.  **Geração de Código:** Se a sua mensagem for interpretada como uma solicitação de geração de código, a extensão pedirá confirmação antes de criar os arquivos.
4.  **Seleção de Modelo:** Use o dropdown no cabeçalho do chat para selecionar o modelo LLM desejado (se aplicável ao provedor).

## Desenvolvimento

- Para compilar em modo watch: `npm run watch`
- Para rodar testes: `npm test`
- Para rodar linters: `npm run lint`

## Agentes Ativos (Implementados)

- **DeveloperAgent**: Gera o código principal do artefato React.
- **TestAgent**: Gera código de teste (Jest/RTL).
- **DesignAgent**: Analisa conformidade com Soma DS e acessibilidade.

(Nota: Outros agentes mencionados em versões anteriores do README foram removidos para simplificar o foco atual.)

## Contribuindo

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Crie um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
