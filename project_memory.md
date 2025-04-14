# Memória do Projeto: PS Copilot

Este arquivo serve como uma memória central para o projeto PS Copilot, registrando o contexto, decisões chave, arquitetura e evolução da extensão.

## 1. Visão Geral e Objetivo

O PS Copilot é uma extensão do Visual Studio Code projetada para auxiliar desenvolvedores React na criação de funcionalidades para a plataforma de microfrontends "Product Setup". A extensão utiliza a API da OpenAI para interpretar comandos em linguagem natural e gerar código React (componentes, páginas, hooks, serviços), aderindo aos padrões e ao **Design System "Soma"** (conforme definido em `soma.txt`).

O objetivo principal é agilizar o desenvolvimento e garantir a consistência do código gerado com os padrões Soma.

## 2. Arquitetura

A extensão segue uma arquitetura baseada em componentes do VS Code e serviços desacoplados:

1.  **`ChatViewProvider`**: Implementa `WebviewViewProvider`. É responsável por:
    - Renderizar a interface do chat (HTML/CSS/JS) na Webview.
    - Gerenciar a comunicação bidirecional entre a Webview e a Extensão (postMessage).
    - Receber mensagens do usuário, processar comandos (ex: `/config`, `/generate`) e interagir com os serviços apropriados.
    - Manter o estado básico da conversa.
    - Orquestrar a chamada inicial para o `CodeGenerationService` para geração de código.
2.  **`OpenAIService`**:
    - Encapsula a comunicação com a API OpenAI (usando a biblioteca `openai` v4+).
    - **Suporta múltiplos provedores:** OpenAI padrão e Azure OpenAI Service.
    - Lê as configurações do provedor (`psCopilot.provider`), credenciais (OpenAI API Key ou Azure Endpoint/API Key/Deployment Name) e parâmetros (modelo/deployment, temperatura, etc.) do `AgentContext`.
    - Inicializa o cliente `OpenAI` apropriado (padrão ou configurado para Azure) com base no provedor selecionado.
    - Valida se as credenciais necessárias para o provedor selecionado estão presentes.
    - Expõe métodos genéricos (`chat`, `generateCode`, `generateTests`, `analyzeDesignCompliance`) que recebem prompts e os encaminham para o cliente `OpenAI` inicializado via `makeRequest`.
3.  **`FileService`**:
    - Abstrai operações de arquivo no workspace do usuário (criar, ler, atualizar, verificar existência) usando a API `vscode.workspace.fs`.
4.  **`CodeGenerationService`**:
    - **Responsabilidade Principal:** Orquestra o fluxo de geração de código multiagente.
    - Recebe a solicitação de geração do `ChatViewProvider`.
    - Instancia os agentes necessários (`DeveloperAgent`, `TestAgent`, `DesignAgent`).
    - Chama os agentes em sequência (ou paralelo quando possível) para:
      - Gerar o código principal (`DeveloperAgent`).
      - Gerar os testes (`TestAgent`).
      - Analisar a conformidade de design e acessibilidade (`DesignAgent`).
    - Utiliza o `FileService` para criar/atualizar os arquivos gerados no workspace.
    - Monta a estrutura final dos arquivos (ex: adicionando análise de design como comentário, criando `index.ts`, `module.css`).
5.  **Agentes (`src/agents`)**:
    - Cada agente encapsula uma especialidade específica.
    - **Responsabilidade Principal:** Construir o prompt (System Prompt e User Content) adequado para sua tarefa e chamar o método correspondente no `OpenAIService`.
    - Agentes Atuais:
      - `DeveloperAgent`: Gera o código principal do componente/hook/serviço/página.
      - `TestAgent`: Gera o código de teste (Jest/RTL).
      - `DesignAgent`: Analisa a conformidade com o Design System Soma e acessibilidade.
    - O diretório `src/agents` foi limpo, removendo agentes não utilizados no fluxo principal.
6.  **Configuração (`package.json` e `settings`)**:
    - Define pontos de contribuição (comandos de abrir chat, views).
    - Permite ao usuário configurar:
      - `psCopilot.provider`: Escolher entre "openai" (padrão) ou "azure".
      - `psCopilot.apiKey`: Chave da API OpenAI (usada apenas se provider="openai").
      - `psCopilot.azure.endpoint`: Endpoint do recurso Azure OpenAI.
      - `psCopilot.azure.apiKey`: Chave da API do recurso Azure OpenAI.
      - `psCopilot.azure.deploymentName`: Nome do deployment (modelo) no Azure.
      - Outros parâmetros como `model`, `temperature`, `maxTokens`, `timeout`.
    - A configuração das chaves API é feita **exclusivamente** através da interface de Configurações do VS Code (settings.json).

## 3. Funcionalidades Implementadas

- **Interface de Chat:**
  - Exibição de histórico de mensagens (usuário e assistente).
  - Seleção de modelo de LLM (GPT-3.5-turbo, GPT-4, etc.).
  - Botão para limpar o chat.
  - Indicador visual de processamento.
- **Configuração:**
  - As credenciais (API Key OpenAI ou Azure Endpoint/Key/Deployment) são definidas diretamente nas configurações do VS Code.
  - **Seleção de Provedor:** Usuário pode escolher entre OpenAI e Azure OpenAI via configuração `psCopilot.provider`.
  - Seleção de modelo LLM via UI (`psCopilot.selectLLMModel`), que atualiza a configuração `psCopilot.model`.
  - Removidos comandos dedicados para configurar/limpar API Key.
- **Geração de Código via Prompt:**
  - Detecção de intenção de geração de código a partir da mensagem do usuário (`_isCodeGenerationRequest`).
  - Identificação do(s) artefato(s) a ser(em) criado(s) (tipo, nome) diretamente da mensagem do usuário dentro do `ChatViewProvider` (`_identifyRequiredArtifacts`).
  - Confirmação do usuário antes da geração, listando os artefatos que serão criados.
  - Orquestração da geração multiagente via `CodeGenerationService`:
    - `DeveloperAgent` gera o código principal.
    - `TestAgent` gera os testes.
    - `DesignAgent` analisa a conformidade.
  - Criação dos arquivos correspondentes no workspace usando `FileService`.
  - Abertura automática do arquivo principal gerado no editor.
  - Feedback na interface sobre o sucesso ou falha da geração.
  - **Integração com Soma DS:** Os prompts dos agentes incluem diretrizes e a lista de componentes Soma.
  - **Ferramentas Simuladas:** O prompt do `DeveloperAgent` instrui a IA a _agir como se_ usasse ferramentas `icon-list` e `component-documentation`.
- **Ícones Personalizados:**
  - Ícone principal (barra de atividades): Desenho de um mosqueteiro.
  - Ícone secundário (explorer view): Desenho de um balão de chat.

## 4. Design System (Soma - via `soma.txt`)

- **Framework:** React
- **Biblioteca de Componentes:** `@soma/react`
- **Regras Principais:**
  - Usar apenas componentes Soma ou HTML nativo estilizado.
  - Importar de `@soma/react`.
  - Usar `SomaIcon` para ícones.
  - Preferir componentes de tipografia Soma (`SomaHeading`, etc.).
  - Estilização: Apenas `px` ou `%`, apenas redimensionamento/posicionamento em componentes Soma.
- **Componentes Disponíveis:** Lista extensa definida em `soma.txt` (e agora incluída no prompt de geração).
- **Ferramentas Mencionadas (Não implementadas):** `icon-list`, `component-documentation`.
- **Formato de Saída Esperado da IA:** JSON com `files` (arquivo principal `./Page.jsx`).

## 5. Evolução e Decisões Recentes

- **Remoção do Formulário de Geração:** A geração agora é acionada pela análise do prompt do usuário no chat.
- **Refatoração do `FileService`:** Resolveu problemas de compilação com Webpack ao usar apenas `vscode.workspace.fs`.
- **Melhoria na Detecção de Solicitações:** A lógica para identificar intenção de geração (`_isCodeGenerationRequest`) e os artefatos (`_identifyRequiredArtifacts`) foi aprimorada no `ChatViewProvider` (removida a dependência de `analyzeRequest`).
- **Correção de API Key:** Implementadas verificações robustas e carregamento/atualização da API Key nos serviços.
- **Atualização de Ícones:** Ícones redesenhados.
- **Integração do Design System Soma:** Regras e componentes Soma incluídos nos prompts dos agentes.
- **Identificação da Necessidade de Agente de Design:** Mantida como um ponto para evolução futura.
- **Refatoração de Agentes:**
  - A lógica de construção de prompts foi delegada para classes de agente dedicadas (`DeveloperAgent`, `TestAgent`, `DesignAgent`) em `src/agents`.
  - `OpenAIService` foi simplificado para atuar apenas como cliente da API OpenAI, recebendo prompts completos dos agentes.
  - `CodeGenerationService` foi refatorado para orquestrar as chamadas aos agentes.
  - Agentes e serviços não utilizados (`CoreCoordinator`, `AgentManagerService`, etc.) e o comando `manageAgents` foram removidos para simplificar a base de código.
- **Resolução de Conflitos Pós-Refatoração:** Corrigidos erros de compilação (variáveis não usadas, chamadas de método incorretas) resultantes da refatoração dos agentes e serviços.
- **Adição de Suporte a Azure OpenAI Service:**
  - Adicionadas configurações para o usuário definir o provedor (OpenAI/Azure) e as credenciais/endpoint do Azure.
  - `OpenAIService` foi refatorado para inicializar o cliente `openai` corretamente para o provedor selecionado (OpenAI ou Azure).
  - `AgentContext` atualizado para incluir as novas configurações.
  - A leitura de configurações em `extension.ts` e `ChatViewProvider` foi atualizada.
- **Simplificação da Configuração de API Key:**
  - Removidos os comandos `psCopilot.configureApiKey` e `psCopilot.clearApiKey`.
  - A configuração das chaves API (OpenAI e Azure) agora é feita exclusivamente através da interface de Configurações padrão do VS Code.
  - `ConfigurationService` e `SecurityService` foram simplificados, removendo a lógica de armazenamento/recuperação de chaves API via `globalState` ou secure storage.
  - `OpenAIService` agora lê as credenciais diretamente das configurações do VS Code ao ser inicializado e quando as configurações mudam.
  - `ChatViewProvider` foi atualizado para remover a dependência do `ConfigurationService` para chaves API e verifica o status da configuração lendo diretamente as configurações.

### Serviços Detalhados

- **`OpenAIService.ts`**:
  - Usa a biblioteca `openai` (v4+).
  - Lê configuração do `provider` e credenciais (API Key/Azure) diretamente das configurações do VS Code no construtor.
  - Adicionado listener `onDidChangeConfiguration` para reinicializar o cliente se as configurações relevantes mudarem.
  - Método `initializeOpenAI` contém lógica condicional para criar o cliente `OpenAI` para Azure (usando `baseURL` construída com endpoint + deployment, `apiKey` do Azure, `defaultQuery` com `api-version`, `defaultHeaders` com `api-key`) ou para OpenAI padrão (usando `apiKey` padrão, sem `baseURL` customizada).
  - Método `validateApiKey` verifica as credenciais apropriadas com base no `provider`.
  - Métodos públicos (`chat`, `generateCode`, etc.) chamam `makeRequest` que usa o cliente `openai` já configurado.
- **`CodeGenerationService.ts`**:
  - Recebe `AgentContext` no construtor.
  - Instancia `OpenAIService`, `FileService`, `DeveloperAgent`, `TestAgent`, `DesignAgent`.
  - Método `generateReactComponent`:
    - Valida a requisição.
    - Chama `developerAgent.generateMainCode`.
    - Chama `testAgent.generateTests` e `designAgent.analyzeDesign` (em paralelo).
    - Chama `extractFiles` para montar os arquivos finais.
    - Chama `fileService` para criar/atualizar arquivos.
  - Método `extractFiles`: Monta a estrutura de arquivos (`.tsx`, `.test.tsx`, `index.tsx`, `.module.css`) com base nos resultados dos agentes. Adiciona a análise de design como comentário.
  - Método `generateBasicTest`: Gera um esqueleto de teste se o `TestAgent` falhar.
  - Método `getDefaultPath`: Retorna o caminho padrão com base no tipo e nome.
- **`FileService.ts`**: Métodos assíncronos para interagir com `vscode.workspace.fs` (readFile, writeFile, stat, delete).
- **`ConfigurationService.ts`**: Simplificado. Não gerencia mais diretamente as API Keys (lidas pelo `OpenAIService`). Pode ser usado para outras configurações via `globalState` se necessário.
- **`SecurityService.ts`**: Simplificado. Não gerencia mais armazenamento seguro da API Key. Mantém `logAudit` (se útil).
