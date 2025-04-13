# Memória do Projeto: PS Copilot

Este arquivo serve como uma memória central para o projeto PS Copilot, registrando o contexto, decisões chave, arquitetura e evolução da extensão.

## 1. Visão Geral e Objetivo

O PS Copilot é uma extensão do Visual Studio Code projetada para auxiliar desenvolvedores React na criação de funcionalidades para a plataforma de microfrontends "Product Setup". A extensão utiliza a API da OpenAI para interpretar comandos em linguagem natural e gerar código React (componentes, páginas, hooks, serviços), aderindo aos padrões e ao **Design System "Soma"** (conforme definido em `soma.txt`).

O objetivo principal é agilizar o desenvolvimento e garantir a consistência do código gerado com os padrões Soma.

## 2. Arquitetura Atual

- **Interface Principal:** Uma Webview (`ChatViewProvider`) que exibe uma interface de chat inspirada no GitHub Copilot.
- **Serviços Principais:**
  - `OpenAIService`: Gerencia a comunicação com a API da OpenAI (GPT-3.5-turbo por padrão) para processamento de chat e análise de solicitações de código. **Deve ser instruído sobre as diretrizes do Soma Design System.**
  - `CodeGenerationService`: Orquestra a geração de código. Recebe a descrição, prepara prompts detalhados para a OpenAI **incorporando as regras e componentes do Soma DS**, extrai o código gerado e cria os arquivos necessários.
  - `FileService`: Abstrai as operações de sistema de arquivos usando a API do VS Code (`vscode.workspace.fs`) para criar, ler, atualizar e verificar a existência de arquivos no workspace.
  - `ConfigurationService`: Gerencia a configuração da extensão, principalmente o armazenamento seguro e recuperação da API Key da OpenAI.
- **Contexto do Agente (`AgentContext`):** Uma interface que mantém o estado e a configuração necessários para os serviços (API Key, modelo, configurações de prompt, estado do VS Code).

**Nota:** A especificação menciona uma arquitetura multiagentes (Desenvolvedor, Design, Produto, Testes), mas a implementação atual foca principalmente nas funcionalidades do agente desenvolvedor (análise de prompt e geração de código) integradas ao `ChatViewProvider` e `OpenAIService`.

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
