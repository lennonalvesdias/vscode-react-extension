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
    - Encapsula a comunicação com a API OpenAI (usando a biblioteca `openai`).
    - Recebe a API Key (via `AgentContext` ou configurações do VS Code).
    - Suporta uma URL de API configurável (`psCopilot.apiUrl`) para proxies.
    - **Responsabilidade Principal:** Atua como um cliente genérico para a API OpenAI, recebendo prompts de sistema e conteúdo do usuário _dos Agentes_ e executando a requisição (`makeRequest`). Métodos públicos (`generateCode`, `generateTests`, `analyzeDesignCompliance`) foram simplificados para apenas encaminhar a requisição.
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
    - Define pontos de contribuição, como comandos e configurações.
    - Permite ao usuário configurar a API Key (`psCopilot.apiKey`) e a URL da API (`psCopilot.apiUrl`) através das configurações do VS Code.

## 3. Funcionalidades Implementadas

- **Interface de Chat:**
  - Exibição de histórico de mensagens (usuário e assistente).
  - Seleção de modelo de LLM (GPT-3.5-turbo, GPT-4, etc.).
  - Botão para limpar o chat.
  - Indicador visual de processamento.
- **Configuração de API Key:**
  - Comando dedicado (`psCopilot.configureApiKey`) para configurar a API Key.
  - Armazenamento seguro da chave.
  - Feedback visual na interface quando a chave não está configurada, com botão para configurar.
  - Verificações em pontos críticos para garantir que a chave está presente antes de chamar a API.
- **Configuração de URL da API OpenAI:**
  - Configuração `psCopilot.apiUrl` nas configurações do VS Code permite definir uma URL personalizada (útil para proxies). Se vazia, usa a URL padrão da OpenAI.
- **Geração de Código via Prompt:**
  - Detecção de intenção de geração de código a partir da mensagem do usuário (ex: "crie um componente", "gere uma página").
  - Análise da solicitação via OpenAI (`analyzeRequest`) para identificar o tipo principal (página, componente, hook, serviço), nome sugerido e componentes relacionados (como um serviço para uma página).
  - Confirmação do usuário antes da geração, listando os artefatos que serão criados.
  - Geração de múltiplos artefatos (ex: página + serviço) com base na análise.
  - Criação dos arquivos correspondentes no workspace usando `FileService`.
  - Abertura automática dos arquivos gerados no editor.
  - Feedback na interface sobre o sucesso ou falha da geração.
  - **Integração Parcial com Soma DS:** O prompt de geração de código agora inclui as diretrizes básicas e a lista de componentes do Soma DS (extraído de `soma.txt`).
  - **Ferramentas Simuladas:** O prompt instrui a IA a _agir como se_ usasse ferramentas `icon-list` e `component-documentation`, pois elas não existem na extensão.
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

- **Remoção do Formulário de Geração:** O formulário dedicado para gerar código foi removido. A geração agora é acionada pela análise do prompt do usuário.
- **Refatoração do `FileService`:** O serviço foi modificado para usar exclusivamente a API `vscode.workspace.fs` do VS Code, eliminando dependências diretas dos módulos `fs` e `path` do Node.js, o que resolveu problemas de compilação com Webpack.
- **Melhoria na Detecção de Solicitações:** A lógica para identificar se uma mensagem do usuário é um pedido de geração de código foi expandida (`_isCodeGenerationRequest`, `_identifyRequiredArtifacts`).
- **Análise de Solicitação Aprimorada:** O `OpenAIService.analyzeRequest` foi melhorado para extrair mais detalhes e estrutura da solicitação do usuário, incluindo componentes relacionados.
- **Correção de API Key:** Implementadas verificações robustas e sincronização da API Key para evitar erros durante a geração de código.
- **Atualização de Ícones:** Os ícones da extensão foram redesenhados para refletir o tema "mosqueteiro" (PS Copilot -> "Product Setup" Copilot).
- **Integração do Design System Soma:** As regras e a lista de componentes do Soma (definidas em `soma.txt`) foram incorporadas aos prompts de geração de código do `CodeGenerationService` para melhorar a aderência do código gerado.
- **Identificação da Necessidade de Agente de Design:** A análise do `soma.txt` (`BeautifyPrompt`) reforçou a necessidade futura de um agente especializado em design para garantir a qualidade visual e aderência ao Soma.
- **Configuração de URL da API OpenAI:** Adicionada a capacidade de configurar uma URL personalizada para a API OpenAI através das configurações do VS Code (`psCopilot.apiUrl`), permitindo o uso de proxies corporativos.

### Serviços Detalhados

- **`OpenAIService.ts`**:
  - Usa a biblioteca `openai`.
  - Inicializa com `AgentContext` (API Key, Modelo, Temperatura, Max Tokens, Timeout, API URL opcional).
  - Busca API Key e API URL das configurações do VS Code se não fornecidas no contexto.
  - Método `makeRequest` privado para chamadas à API `chat.completions.create`.
  - Métodos públicos (`generateCode`, `generateTests`, `analyzeDesignCompliance`) simplificados que recebem `systemPrompt` e `userContent` e chamam `makeRequest`. Não contém mais lógica de construção de prompts específicos dos agentes.
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
