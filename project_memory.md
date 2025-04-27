# Memória do Projeto: PS Copilot

Este arquivo serve como uma memória central para o projeto PS Copilot, registrando o contexto, decisões chave, arquitetura e evolução da extensão.

## 1. Visão Geral e Objetivo

O PS Copilot é uma extensão do Visual Studio Code projetada para auxiliar desenvolvedores React na criação de funcionalidades para a plataforma de microfrontends "Product Setup". A extensão utiliza a API da OpenAI para interpretar comandos em linguagem natural e gerar código React (componentes, páginas, hooks, serviços), aderindo aos padrões e ao **Design System "Soma"** (conforme definido em `soma.txt`).

O objetivo principal é agilizar o desenvolvimento e garantir a consistência do código gerado com os padrões Soma.

## 2. Arquitetura

A arquitetura segue uma abordagem baseada em componentes do VS Code e serviços desacoplados:

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
    - Expõe métodos genéricos (`chat`, `generateCode`, `generateTests`) que recebem prompts e os encaminham para o cliente `OpenAI` inicializado via `makeRequest`.
3.  **`FileService`**:
    - Abstrai operações de arquivo no workspace do usuário (criar, ler, atualizar, verificar existência) usando a API `vscode.workspace.fs`.
4.  **`CodeGenerationService`**:
    - **Responsabilidade Principal:** Orquestra o fluxo de geração de código multiagente.
    - Recebe a solicitação de geração do `ChatViewProvider`.
    - Instancia os agentes necessários (`ArquitetoAgent`, `DeveloperAgent`, `TestAgent`, `PromptClassifierAgent`).
    - Chama os agentes em sequência (ou paralelo quando possível) para:
      - Analisar a intenção do usuário (`PromptClassifierAgent`).
      - Criar um plano detalhado de desenvolvimento (`ArquitetoAgent`).
      - Gerar o código principal seguindo o plano (`DeveloperAgent`).
      - Gerar os testes (`TestAgent`).
    - Utiliza o `FileService` para criar/atualizar os arquivos gerados no workspace.
    - Monta a estrutura final dos arquivos (ex: adicionando o plano de desenvolvimento como comentário, criando `index.ts`, `module.css`).
5.  **Agentes (`src/agents`)**:
    - Cada agente encapsula uma especialidade específica.
    - **Responsabilidade Principal:** Construir o prompt (System Prompt e User Content) adequado para sua tarefa e chamar o método correspondente no `OpenAIService`.
    - Agentes Atuais:
      - `PromptClassifierAgent`: Determina se a intenção do usuário é gerar código ou simplesmente conversar.
      - `ArquitetoAgent`: Planeja a arquitetura e estrutura do código, criando um roadmap detalhado.
      - `DeveloperAgent`: Implementa o código seguindo o plano criado pelo arquiteto.
      - `TestAgent`: Gera o código de teste (Jest/RTL).
6.  **Diretrizes Compartilhadas (`src/shared`)**:
    - `SomaGuidelines.ts`: Centraliza as regras e componentes do Design System Soma.
    - Fornece funções para obter partes específicas das diretrizes ou todas elas.
    - Garante consistência entre os diferentes agentes ao usar o Design System Soma.
7.  **Configuração (`package.json` e `settings`)**:
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
  - Renderização de markdown com suporte a realce de sintaxe em blocos de código.
  - Botão de cópia para blocos de código com identificação automática de linguagem.
  - Design responsivo e adaptado ao tema do VS Code.
- **Configuração:**
  - As credenciais (API Key OpenAI ou Azure Endpoint/Key/Deployment) são definidas diretamente nas configurações do VS Code.
  - **Seleção de Provedor:** Usuário pode escolher entre OpenAI e Azure OpenAI via configuração `psCopilot.provider`.
  - Seleção de modelo LLM via UI (`psCopilot.selectLLMModel`), que atualiza a configuração `psCopilot.model`.
  - Removidos comandos dedicados para configurar/limpar API Key.
- **Geração de Código via Prompt:**
  - Detecção de intenção de geração de código a partir da mensagem do usuário (`PromptClassifierAgent`).
  - Identificação do(s) artefato(s) a ser(em) criado(s) (tipo, nome) diretamente da mensagem do usuário dentro do `ChatViewProvider` (`_identifyRequiredArtifacts`).
  - Confirmação do usuário antes da geração, listando os artefatos que serão criados.
  - Orquestração da geração multiagente via `CodeGenerationService`:
    - `ArquitetoAgent` cria o plano detalhado de desenvolvimento.
    - `DeveloperAgent` implementa o código seguindo o plano do arquiteto.
    - `TestAgent` gera os testes.
  - Criação dos arquivos correspondentes no workspace usando `FileService`.
  - Abertura automática do arquivo principal gerado no editor.
  - Feedback na interface sobre o sucesso ou falha da geração.
  - **Integração com Soma DS:** Os prompts dos agentes incluem diretrizes e a lista de componentes Soma.
  - **Consistência no Frontend:** Garantia de que todo código frontend gerado respeite as diretrizes do Soma.
- **Ícones Personalizados:**
  - Ícone principal (barra de atividades): Desenho de um mosqueteiro.
  - Ícone secundário (explorer view): Desenho de um balão de chat.

## 4. Design System (Soma - via `SomaGuidelines.ts`)

- **Framework:** React
- **Biblioteca de Componentes:** `@soma/react`
- **Estrutura das Diretrizes:**
  - `getSomaRules()`: Regras principais do Design System.
  - `getSomaComponents()`: Lista de componentes disponíveis.
  - `getCodeQualityGuidelines()`: Diretrizes de qualidade de código.
  - `getCompleteSomaGuidelines()`: Consolidação de todas as diretrizes.
- **Regras Principais:**
  - Usar apenas componentes Soma ou HTML nativo estilizado.
  - Importar de `@soma/react`.
  - Usar `SomaIcon` para ícones.
  - Preferir componentes de tipografia Soma (`SomaHeading`, etc.).
  - Estilização: Apenas `px` ou `%`, apenas redimensionamento/posicionamento em componentes Soma.
- **Integração:**
  - Diretrizes incluídas no sistema de chat para respostas sobre desenvolvimento frontend.
  - Utilizadas pelo `ArquitetoAgent` para planejar a estrutura do código.
  - Seguidas pelo `DeveloperAgent` para implementar o código conforme o plano.

## 5. Evolução e Decisões Recentes

- **Remoção do Formulário de Geração:** A geração agora é acionada pela análise do prompt do usuário no chat.
- **Refatoração do `FileService`:** Resolveu problemas de compilação com Webpack ao usar apenas `vscode.workspace.fs`.
- **Melhoria na Detecção de Solicitações:** A lógica para identificar intenção de geração (`_isCodeGenerationRequest`) e os artefatos (`_identifyRequiredArtifacts`) foi aprimorada no `ChatViewProvider` (removida a dependência de `analyzeRequest`).
- **Análise de Intenção Baseada em IA:**
  - Implementação de um novo fluxo que utiliza o modelo de linguagem para analisar e classificar se a mensagem do usuário é uma solicitação de geração de código ou uma conversa normal.
  - Criação do `PromptClassifierAgent` como um agente dedicado à classificação de intenções.
  - Adição do método `makeRequest` público no `OpenAIService` para permitir chamadas diretas pelos agentes.
  - Remoção do método antigo `analyzeUserIntent` do `OpenAIService` e movido para `PromptClassifierAgent`.
  - Implementação de método `analyzeUserIntent` no `CodeGenerationService` que utiliza o novo agente.
  - Atualização do `_processMessage` no `ChatViewProvider` para usar essa nova funcionalidade.
  - Implementação de fallback para o método baseado em padrões (`_isCodeGenerationRequest`) em caso de erro na análise via IA.
  - Feedback visual ao usuário sobre a decisão da IA antes de iniciar a geração de código.
- **Arquitetura Multiagente Aprimorada:**
  - Substituição do `DesignAgent` pelo novo `ArquitetoAgent` que cria um plano de desenvolvimento detalhado.
  - Modificação do `DeveloperAgent` para implementar código com base no plano criado pelo `ArquitetoAgent`.
  - Criação de um arquivo de diretrizes compartilhadas (`SomaGuidelines.ts`) que é usado por todos os agentes.
  - Integração das diretrizes do Soma no chat regular para garantir que respostas sobre frontend sigam o Design System.
  - Melhoria na qualidade do código gerado com foco na prevenção de erros estáticos.
- **Correção de API Key:** Implementadas verificações robustas e carregamento/atualização da API Key nos serviços.
- **Atualização de Ícones:** Ícones redesenhados.
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
- **Melhorias na Interface de Chat:**
  - Refatoração completa da estrutura de layout para garantir que as mensagens apareçam sempre acima do campo de entrada.
  - Implementação de um contêiner de lista de mensagens para melhor organização visual.
  - Uso explícito da propriedade `order` no CSS para garantir a sequência correta dos elementos (cabeçalho, mensagens, campo de entrada).
  - Correção de problemas de rolagem automática para a última mensagem.
- **Realce de Sintaxe e Cópia de Código:**
  - Integração com PrismJS para destacar a sintaxe de código em diferentes linguagens.
  - Adição de botão de cópia para blocos de código com feedback visual ("Copiado!").
  - Detecção automática de linguagem de programação nos blocos de código.
  - Adição de cabeçalho nos blocos de código exibindo a linguagem detectada.
- **Unificação Visual com o VS Code:**
  - Uso de variáveis de tema nativas do VS Code para adaptação ao tema atual do usuário.
  - Remoção de cores fixas em favor de variáveis CSS derivadas do tema do VS Code.
  - Melhoria no contraste e legibilidade de elementos.
  - Esquema de cores unificado para cabeçalho, área de mensagens e campo de entrada.
  - Implementação de variáveis CSS para todas as cores da interface, garantindo consistência visual.
  - Ajustes nos botões, campos de texto e elementos interativos para seguir o estilo do VS Code.
- **Componentes React Aprimorados:**
  - Criação de componentes dedicados para elementos específicos como botão de cópia de código.
  - Implementação de renderizadores personalizados para cada tipo de elemento markdown.
  - Uso de referências para acesso direto a elementos DOM críticos como o contêiner de mensagens.
  - Gerenciamento de estado otimizado para interações do usuário como cópia de código.
- **Correções de Problemas de Layout:**
  - Resolução do problema onde mensagens eram exibidas abaixo do campo de entrada.
  - Implementação correta da estrutura de flex com ordem explícita para garantir o posicionamento dos elementos.
  - Criação de uma classe `.messages-list` dedicada para agrupar as mensagens com espaçamento adequado.
  - Ajuste da altura e dimensões dos contêineres para melhor utilização do espaço disponível.
- **Melhoria na Renderização de Markdown:**
  - Implementação de componentes personalizados para cada elemento markdown para garantir formatação consistente.
  - Tratamento especial para blocos de código com detecção de linguagem e realce de sintaxe.
  - Suporte a links externos que abrem em nova aba do navegador.
  - Preservação da formatação de listas, tabelas e outros elementos complexos de markdown.
- **Correção do Processamento de Solicitações de Geração:**
  - Adição de uma implementação provisória no método `processCodeGenerationRequest` para evitar erros de linter.
  - Esta implementação será substituída pela lógica completa em futuras atualizações.

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
  - Instancia `OpenAIService`, `FileService`, `ArquitetoAgent`, `DeveloperAgent`, `TestAgent`, `PromptClassifierAgent`.
  - Método `generateReactComponent`:
    - Valida a requisição.
    - Chama `arquitetoAgent.createDevelopmentPlan`.
    - Chama `developerAgent.generateMainCode`.
    - Chama `testAgent.generateTests` e `promptClassifierAgent.analyzeUserIntent` (em paralelo).
    - Chama `extractFiles` para montar os arquivos finais.
    - Chama `fileService` para criar/atualizar arquivos.
  - Método `extractFiles`: Monta a estrutura de arquivos (`.tsx`, `.test.tsx`, `index.tsx`, `.module.css`) com base nos resultados dos agentes. Adiciona o plano de desenvolvimento como comentário.
  - Método `generateBasicTest`: Gera um esqueleto de teste se o `TestAgent` falhar.
  - Método `getDefaultPath`: Retorna o caminho padrão com base no tipo e nome.
- **`FileService.ts`**: Métodos assíncronos para interagir com `vscode.workspace.fs` (readFile, writeFile, stat, delete).
- **`ConfigurationService.ts`**: Simplificado. Não gerencia mais diretamente as API Keys (lidas pelo `OpenAIService`). Pode ser usado para outras configurações via `globalState` se necessário.
- **`SecurityService.ts`**: Simplificado. Não gerencia mais armazenamento seguro da API Key. Mantém `logAudit` (se útil).

## 6. Implementação da Interface de Chat (WebView)

A interface de chat foi implementada utilizando React e estilização CSS:

- **Componentes Principais:**

  - `ChatInterface`: Componente principal que renderiza toda a interface.
  - `LoadingDots`: Componente para indicação visual de processamento.
  - `CodeBlock`: Componente especializado para exibir blocos de código com realce de sintaxe e botão de cópia.
  - `CopyButton`: Componente para copiar código para a área de transferência com feedback visual.

- **Estrutura Visual:**

  - Cabeçalho: Contém seletor de modelo e botão de limpar conversa.
  - Área de mensagens: Exibe histórico de conversa com suporte a markdown.
  - Campo de entrada: Textarea para digitar mensagens com botão de envio.

- **Tecnologias e Bibliotecas:**

  - `ReactMarkdown`: Para renderização de markdown nas respostas do assistente.
  - `remark-gfm`: Plugin para suporte a recursos estendidos de markdown (tabelas, listas de tarefas).
  - `rehype-raw`: Plugin para permitir HTML dentro do markdown.
  - `PrismJS`: Para realce de sintaxe em blocos de código.

- **Escolhas de Design:**

  - Interface limpa e minimalista inspirada no GitHub Copilot.
  - Adaptação automática ao tema atual do VS Code.
  - Foco na legibilidade e usabilidade para desenvolvedores.
  - Blocos de código com identificação de linguagem e botão de cópia.
  - Ausência de fundos coloridos nas mensagens para maior limpeza visual.
  - Uso de animações sutis para feedback durante interações.

- **Desafios Superados:**
  - Problemas de layout com mensagens aparecendo abaixo do campo de entrada (resolvido com uso adequado de flexbox e propriedade `order`).
  - Falhas na renderização de markdown (resolvido com implementação correta de componentes personalizados).
  - Integração com tema do VS Code (resolvido com uso de variáveis CSS nativas do VS Code).
  - Identificação de linguagem em blocos de código (resolvido com expressões regulares e mapeamento de aliases).
