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
- **Configuração de URL da API OpenAI:** Implementada.
- **Refatoração de Agentes:**
  - A lógica de construção de prompts foi delegada para classes de agente dedicadas (`DeveloperAgent`, `TestAgent`, `DesignAgent`) em `src/agents`.
  - `OpenAIService` foi simplificado para atuar apenas como cliente da API OpenAI, recebendo prompts completos dos agentes.
  - `CodeGenerationService` foi refatorado para orquestrar as chamadas aos agentes.
  - Agentes e serviços não utilizados (`CoreCoordinator`, `AgentManagerService`, etc.) e o comando `manageAgents` foram removidos para simplificar a base de código.
- **Resolução de Conflitos Pós-Refatoração:** Corrigidos erros de compilação (variáveis não usadas, chamadas de método incorretas) resultantes da refatoração dos agentes e serviços.

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
