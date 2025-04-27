/**
 * Este arquivo contém as diretrizes do Design System Soma que são compartilhadas
 * entre os diferentes agentes para garantir consistência na geração de código.
 */

/**
 * Retorna as regras principais do Design System Soma.
 */
export function getSomaRules(): string {
  return `
**REGRAS DO DESIGN SYSTEM SOMA (OBRIGATÓRIAS):**
- **USE SOMENTE COMPONENTES SOMA:** Utilize exclusivamente componentes do Design System Soma importados de '@soma/react'.
- **HTML NATIVO:** Use elementos HTML nativos SOMENTE se não houver um componente Soma adequado. Se usar HTML nativo, estilize-o minimamente (apenas layout/espaçamento).
- **TIPOGRAFIA SOMA:** Prefira os componentes de tipografia Soma (SomaHeading, SomaSubtitle, SomaParagraph, etc.) em vez de tags HTML.
- **ÍCONES SOMA:** Use SEMPRE o componente 'SomaIcon' para renderizar ícones.
- **ESTILIZAÇÃO:** Permita apenas redimensionamento e posicionamento em componentes Soma. Use SOMENTE 'px' ou '%' como unidades de medida. NUNCA use 'vh', 'vw', 'em', 'rem', etc.
- **EXPORTAÇÃO:** Exporte o componente/hook/serviço principal como default.
- **IMPORTAÇÕES:** Todas as importações do Soma devem ser de '@soma/react' (Ex: import { SomaButton } from '@soma/react').
`.trim();
}

/**
 * Retorna a lista de componentes disponíveis no Design System Soma.
 */
export function getSomaComponents(): string {
  return `
**COMPONENTES DISPONÍVEIS DO SOMA:**
- SomaAccordion: Um componente que permite expandir ou colapsar seu conteúdo.
- SomaAccordionFooter: O rodapé do Accordion.
- SomaAccordionHeader: O cabeçalho do Accordion.
- SomaAccordionItem: Um item de conteúdo dentro de um Accordion.
- SomaAlert: Exibe uma mensagem curta e importante com diferentes níveis de severidade.
- SomaAutocomplete: Um campo de texto com filtragem de opções.
- SomaAvatar: Exibe uma imagem em miniatura que representa um usuário.
- SomaBadge: Destaca informações numéricas e textuais.
- SomaBanner: Componente de carrossel.
- SomaButton: Permite aos usuários realizar ações e tomar decisões com um toque.
- SomaButtonLink: Uma âncora web indicando ações de clique.
- SomaCalendar: Captura eventos e exibe informações relacionadas a calendário.
- SomaCaption: Um componente de texto para descrições.
- SomaCard: Contém conteúdo e ações sobre um único assunto.
- SomaCardActions: Contém as ações disponíveis em um soma-card.
- SomaCardContent: Contêiner para o conteúdo principal em um soma-card.
- SomaCardHeader: Contém o título de um card e pode conter um ícone.
- SomaCardMedia: Contêiner de mídia (imagem, vídeo) em um soma-card.
- SomaCheckbox: Permite ao usuário selecionar um ou mais itens de um conjunto.
- SomaChip: Usado para filtrar e exibir conteúdo na tela.
- SomaContainer: Usado em um sistema de grid para determinar a área total do conteúdo.
- SomaDatepicker: Usado para entrada e exibição de datas.
- SomaDescription: Um componente de texto para descrições.
- SomaDialog: Exibe uma mensagem importante acima do elemento de referência.
- SomaDivider: Usado para separar conteúdo horizontal ou verticalmente.
- SomaDrawer: Exibe um painel lateral que pode ser aberto ou fechado.
- SomaForm: Componente de formulário para gerenciar campos internos.
- SomaGrid: Um sistema de grid responsivo.
- SomaGridCol: Representa uma coluna dentro do sistema de grid.
- SomaGridRow: Representa uma linha dentro do sistema de grid.
- SomaHeading: Um componente de texto para cabeçalhos/títulos de seção.
  Tamanho da fonte para cada variante:
  - heading-1: 80px
  - heading-2: 64px
  - heading-3: 48px
  - heading-4: 32px
  - heading-5: 24px
  - heading-6: 20px
- SomaIcon: Renderiza um ícone do Design System Soma.
- SomaIconButton: Exibe um botão onde o único conteúdo é o ícone especificado.
- SomaLink: Componente de link/âncora.
- SomaList: Componente usado para criar listagens.
- SomaListItem: Um item em uma lista, dentro do componente SomaList.
- SomaMenu: Uma lista flutuante de opções clicáveis.
- SomaMenuItem: Representa um item em uma lista flutuante de opções.
- SomaModal: Componente Modal/Dialog.
- SomaPagination: Permite ao usuário navegar entre páginas.
- SomaParagraph: Um componente de texto comum no corpo da página.
- SomaPopover: Um pop-up simples para fornecer informações extras ou operações.
- SomaProgress: Uma barra de progresso para mostrar o estado de carregamento.
- SomaRadio: Permite ao usuário selecionar uma opção de um conjunto.
- SomaRadioGroup: Agrupa soma-radio e emite eventos com o valor selecionado.
- SomaSelect: Usado para coletar informações fornecidas pelo usuário em uma lista de opções.
- SomaSkeleton: Exibe uma visualização de espaço reservado de conteúdo antes do carregamento.
- SomaSnackbar: Fornece mensagens breves sobre processos de aplicativos.
- SomaSpinner: Um indicador de carregamento giratório para mostrar o estado de carregamento.
- SomaStepper: Um componente de navegação que guia o usuário em um processo passo a passo.
- SomaStep: Representa uma etapa dentro do processo.
- SomaSubtitle: Um componente de texto para subtítulos.
- SomaSwitch: Alterna o estado de uma única configuração.
- SomaTable: Apresenta informações em um formato fácil de visualizar.
- SomaTableBody: Seção do corpo da tabela.
- SomaTableCell: Uma célula de conteúdo em uma tabela.
- SomaTableHead: Cabeçalho da tabela.
- SomaTableRow: Uma linha de conteúdo em uma tabela.
- SomaTabs: Um componente de navegação e exibição de conteúdo.
- SomaTextField: Componente de entrada.
- SomaTextarea: Permite aos usuários inserir texto em uma interface de usuário.
- SomaTimePicker: Um seletor de horário que permite selecionar um valor predeterminado.
- SomaTooltip: Fornece informações e dicas curtas ao usuário.
- SomaUpload: Permite seleção de arquivos.
`.trim();
}

/**
 * Retorna diretrizes de qualidade e boas práticas para o código React com Soma.
 */
export function getCodeQualityGuidelines(): string {
  return `
**DIRETRIZES DE QUALIDADE DE CÓDIGO:**
- Use TypeScript com tipagem adequada para props e estados.
- Prefira componentes funcionais com React Hooks.
- Evite props drilling excessivo; use contexto quando apropriado.
- Siga padrões de composição de componentes React.
- Mantenha componentes pequenos e focados em uma única responsabilidade.
- Garanta acessibilidade (WCAG) em todos os componentes.
- Inclua comentários para código complexo ou decisões não óbvias.
- Siga as convenções de nomenclatura (PascalCase para componentes, camelCase para funções).
- Para hooks personalizados, sempre comece com 'use' e exporte como default.
- Para serviços, use o sufixo 'Service' e exporte como default.
`.trim();
}

/**
 * Retorna o prompt completo com todas as diretrizes do Soma.
 */
export function getCompleteSomaGuidelines(): string {
  return `
${getSomaRules()}

${getSomaComponents()}

${getCodeQualityGuidelines()}
`.trim();
}