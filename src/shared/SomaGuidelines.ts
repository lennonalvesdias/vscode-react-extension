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
- **USE SOMENTE COMPONENTES SOMA: Utilize exclusivamente componentes do Design System Soma importados de '@soma/react'.
- **HTML NATIVO:** Use elementos HTML nativos SOMENTE se não houver um componente Soma adequado. Se usar HTML nativo, estilize-o minimamente (apenas layout/espaçamento).
- **TIPOGRAFIA SOMA:** Prefira os componentes de tipografia Soma (SomaHeading, SomaSubtitle, SomaParagraph, etc.) em vez de tags HTML.
- **ÍCONES SOMA:** Use SEMPRE o componente 'SomaIcon' para renderizar ícones. Utilize a ferramenta 'soma-icon-list' para encontrar o ícone desejado.
- **ESTILIZAÇÃO:** Permita apenas redimensionamento e posicionamento em componentes Soma. Use SOMENTE 'px' ou '%' como unidades de medida. NUNCA use 'vh', 'vw', 'em', 'rem', etc.
- **EXPORTAÇÃO:** Exporte o componente/hook/serviço principal como default.
- **IMPORTAÇÕES:** Todas as importações do Soma devem ser de '@soma/react' (Ex: import { SomaButton } from '@soma/react').
- **DOCUMENTAÇÃO DE COMPONENTES:** Sempre utilize a ferramenta 'soma-component-documentation' para obter todas as informações sobre o componente Soma antes de gerar o código.
- **QUALIDADE VISUAL:** Crie páginas incríveis e bonitas! Pense no espaçamento entre elementos, cores e tipografia.
- **RESTRIÇÕES DE ESTILO:** Apenas redimensionamentos e alterações de posicionamento são permitidos nos componentes Soma.
`.trim();
}

/**
 * Retorna a lista de componentes disponíveis no Design System Soma.
 */
export function getSomaComponents(version = 4): string {
  console.log('getSomaComponents called with version:', version);
  return version === 3 ? getSomaV3Components() : getSomaV4Components();
}

/**
 * Retorna a lista de componentes disponíveis no Design System Soma v3.
 */
export function getSomaV3Components(): string {
  return `
**COMPONENTES DISPONÍVEIS DO SOMA V3:**
SomaAccordion: O Soma Accordion é um componente onde sua área de conteúdo pode ser colapsada ou expandida.
SomaAccordionFooter: O Accordion Header é um componente de conteúdo do header um accordion, ele se definido substituirá o header default do Accordion.
SomaAccordionHeader: O Accordion Header é um componente de conteúdo do header um accordion, ele se definido substituirá o header default do Accordion.
SomaAccordionItem: O Accordion Item é um item de conteúdo de um accordion, que pode ser colapsado ou expandido.
SomaAlert: O componente soma-alert exibe uma mensagem curta e importante de uma forma que atrai a atenção do usuário sem interromper o que ele estiver fazendo.
SomaAutocomplete: O Autocomplete é um componente de filtragem de opções através de um campo de texto.
SomaAutocompleteItem: O Soma Autocomplete Item é um componente de item de uma lista flutuante de opcões clicáveis quando é realizada alguma busca ou filtragem com o autocomplete.
SomaAvatar: O Componente soma-avatar é utilizado para mostrar uma imagem miniatura que representa um usuário da interface.
SomaBackdrop: O componente soma-backdrop tem por objetivo inserir um pano de fundo para a inserção de componentes em cima da tela, comumente utilizado no soma-modal.
SomaBadge: O Componente soma-badge permite que os usuários sejam facilmente sinalizados por informação numérica e textual.
SomaBanner:
SomaBannerItem:
SomaButton: O componente soma-button permite que os usuários tomem ações e decisões com um básico toque, eles comunicam ações que os usuários podem realizar.
SomaButtonLink: O Componente soma-button-link é uma âncora para a web e é baseado no elemento HTML <a></a> e indica sempre ações de click.
SomaCalendar: O Calendar é um componente utilizado para captura de eventos e exibição de informação relacionadas ao calendário, o soma-calendar suporta data-range por meio do type range. Você pode desabilitar dias e navegação utilizando a API, consulte abaixo. Também é possível marcar datas específicas no calendário.
SomaCalendarDay: Component usando internamente pelo soma-calendar.
SomaCaption: O soma-caption é um dos componentes de texto do soma.
SomaCard: O soma-card contém conteúdo e ações sobre um único assunto e fornece um amplo número de opções podendo ser utilizados com textos, imagens e vídeos.
SomaCardActions: O soma-card-actions contém as ações disponíveis em um soma-card.
SomaCardContent: O soma-card-content é utilizado como container do conteúdo principal e seus respectivos elementos em um soma-card.
SomaCardHeader: O soma-card-header contém titulo de um card e pode conter um ícone, deve ser utilizado como container de elementos de título dentro de um soma-card.
SomaCardMedia: O soma-card-media é utilizado como container de mídia (imagem, video) que pode ocupar todo o espaço de layout em um soma-card.
SomaCardMediaDescription: O soma-card-media-description é utilizado para descrever o conteúdo de mídia (imagem, video), é utilizado juntamente com o soma-card-media.
SomaChart:
SomaChartDonut:
SomaChartLine:
SomaChartSinglebar:
SomaChartSinglebarItem:
SomaChartSinglebarLegend:
SomaChartSinglebarLegendItem:
SomaCheckbox: O Componente soma-checkbox permite ao usuário selecionar um ou mais itens de um conjunto.
SomaChip: O soma-chip deve ser utilizado para filtrar e exibir conteúdos na tela.
SomaCoachmark:
SomaCoachmarkContent:
SomaCoachmarkHighlight:
SomaContainer: O Soma Container faz parte dos componentes de Layout, é um componente utilizado em um sistema de grid para determinar a área total do conteúdo de uma página ou sessão com comportamento responsivo onde sua largura e espaçamento lateral são modificados de acordo com o breakpoint da tela.
SomaContext: O Context é um componente de comportamento que irá gerenciar o contexto dos componentes aninhados para que você possa de uma só vez aplicar estlização em massa (como por exemplo inverse).
SomaDatepicker: O Datepicker é um componente utilizado para i/o de datas, o soma-datepicker suporta range picker por meio do type range. Você pode desabilitar dias e navegação utilizando a API, consulte abaixo. Também é possível marcar datas específicas no calendário.
SomaDatepickerShortcut:
SomaDescription: O soma-description é um dos componentes de texto do soma, voltado para descrição.
SomaDialog: O componente soma-dialog exibe uma mensagem acima do elemento de referência para mostrar uma mensagem importante para o usuário.
SomaDialogWarning: O componente soma-dialog-warning exibe uma mensagem acima do elemento de referência para mostrar uma mensagem importante para o usuário.
SomaDivider: O soma-divider deve ser usado para fazer a separação horizontal ou vertical de conteúdos
SomaDrawer:
SomaDrawerAction:
SomaDrawerContent:
SomaDrawerHeader:
SomaForm: Componente de formulário para gestão de todos os campos internos de um formulário.
SomaGrid: O componente soma-grid é um sistema de grid e pode receber uma série de linhas (soma-grid-row) e colunas (soma-grid-col) para fazer o layout e alinhar o conteúdo. É construído com flexbox e é totalmente responsivo.
SomaGridCol: O componente soma-grid-col representa uma coluna de conteúdo dentro de um sistema de grid.
SomaGridRow: O componente soma-grid-row representa uma linha de conteúdo dentro de um sistema de grid, ele deve receber um conjunto de elementos de coluna (soma-grid-col).
SomaHeading: O soma-heading é um dos componentes de texto do soma, voltado para cabeçalho.
SomaHide: O Componente soma-hide é utilizado para ocultar conteúdos da tela em determinados breakpoints.
SomaIcon: Os ícones do Soma Web são carregados de maneira lazy, ele possui 3 propriedades: icon, size e color, a propriedade icon é o tipo do ícone que você vai utilizar (lista completa abaixo), a propriedade size podem ser 4 tamanhos predefinidos: sm, md, lg e xl, o último possui bem menos ícones, a propridade color é a cor do ícone.
SomaIconButton: O componente soma-icon-button possui o funcionamento semelhante ao soma-button no qual permite que os usuários tomem ações e decisões com um básico toque, eles comunicam ações que os usuários podem realizar.
SomaInputBankPassword: O componente soma-input-bank-password permite o usuário a inserir sua senha no modelo padronizado pelos bancos. Use o mesmo para auxiliar no login do usuário na plataforma.
SomaLink: O Componente soma-link é uma âncora para a web e é baseado no elemento HTML <a></a> e indica sempre ações de click.
SomaList: O componente soma-list representa uma lista contínua e vertical que pode apresentar texto ou imagens.
SomaListItem: O componente soma-list-item faz parte dos componentes de lista e representa um item da lista, ficando dentro do componente soma-list.
SomaListItemAction: O componente soma-list-item-action faz parte dos componentes de lista e fica dentro do componente soma-list-item, mapeando as ações do lado direito.
SomaMenu: O Soma Menu é um componente com uma lista flutuante de opcões clicáveis, pode ser utilizado para compor outros componentes como autocomplete, select, search, entre outros.
SomaMenuAnchor:
SomaMenuItem: O Soma Menu Item é um componente de item de uma lista flutuante de opcões clicáveis.
SomaModal: O componente soma-modal fornece uma base sólida para criar componentes que sobressaem a tela do usuário.
SomaOption: O Soma Option é um componente de item de uma lista flutuante de opcões clicáveis em um select.
SomaPagination: O componente de paginação permite ao usuário navegar sobre páginas a partir de um intervalo.
SomaParagraph: O soma-paragraph é um dos componentes de texto do soma, voltado para parágrafos.
SomaPopover: O Soma Popover é um pop-up simples para fornecer informações ou operações extras. A comparação com Soma Tooltip, além do popover poder fornecer mais informações textuais, também pode fornecer elementos de ação como links e botões.
SomaPopoverContent:
SomaPopper: O Componente Popper pode ser usado para exibir algum conteúdo com posicionamento relacional, ele posicionará qualquer componente que "salte" do fluxo de seu documento e flutue perto de um elemento de destino.
SomaPopperContent:
SomaProgress: O componente soma-progress funciona como uma barra de progresso e deve ser utilizado como feedback dinâmico que represente a evolução em tempo real de algo "em processamento".
SomaQuantity: O Soma Quantity incrementa ou decrementa valores númericos de forma intuitiva.
SomaRadio: O componente soma-radio permite o usuário selecionar uma das opções de um conjunto.
SomaRadioGroup: O componente soma-radio-group permite o usuário a agrupar o soma-radio e obter o comportamento nativo.
SomaRating: O componente soma-rating fornece informações sobre opiniões e experiências de outros usuários com um produto ou serviço, através do soma-rating o usuário também pode fazer novas avaliações.
SomaSearch: O componente soma-search permite que os usuários digitem e editem texto com finalidade de busca. Campos de busca permitem que os usuários insiram texto em uma interface voltada a pesquisas.
SomaSelect: Os componentes de seleção são usados para coletar informações fornecidas pelo usuário em uma lista de opções. Os menus são posicionados rente a seus elementos emissores, de modo que o item de menu atualmente selecionado apareça na parte inferior do elemento emissor.
SomaShortcut: O Componente soma-shortcut é um componente de atalho. O soma-shortcut pode ser utilizado principalmente em interfaces mobile como atalho para acessar produtos e serviços.
SomaSkeleton: Exiba uma visualização do espaço reservado de seu conteúdo antes que os dados sejam carregados, reduzindo a sensação de lentidão do tempo de carregamento.
SomaSmartForm: Componente de formulário para gestão de todos os campos internos de um formulário que faz integração com a Segment e Salesforce para a captura de leads.
SomaSnackbar: Snackbars fornecem mensagens breves sobre os processos de aplicativos.
SomaSpinner: O Soma Spinner é um loading giratório para exibir o estado de carregamento de uma página ou seção.
SomaStep:
SomaStepper:
SomaSubtitle: O soma-subtitle é um dos componentes de texto do soma, voltado para subtítulo.
SomaSwitch: O componente soma-switch alterna o estado de uma única configuração: ligado ou desligado.
SomaSwitchText:
SomaTab: O componente soma-tab é utilizado como container de media dentro de um soma-tabs.
SomaTable: O Soma Table é um componente utilizado para apresentar informações de uma forma fácil de visualizar, de modo que os usuários podem procurar por padrões e percepções.
SomaTableBody: Escreva a descrição do componente SomaTableBody.
SomaTableCell: O Componente SomaTableCell representa uma célula de conteúdo de uma tabela.
SomaTableCollapse: Escreva a descrição do componente SomaTableCollapse.
SomaTableHead: Escreva a descrição do componente SomaTableHead.
SomaTableRow: O Componente SomaTableRow representa uma linha de conteúdo de uma tabela.
SomaTabs: O componente soma-tabs é um componente de navegação e exibição de conteúdos, pode ser utilizado para exibir conteúdos na tela que não precisam de uma nova página.
SomaTextField:
SomaTextarea: Campos de texto permitem que os usuários insiram texto em uma interface de usuário. Eles geralmente aparecem em formulários e diálogos.
SomaTimePicker: O componente soma-time-picker é um seletor de tempo que fornece uma maneira simples de selecionar um único valor de um conjunto pré-determinado de hora/minuto/periodo.
`.trim();
}

/**
 * Retorna a lista de componentes disponíveis no Design System Soma v4.
 */
export function getSomaV4Components(): string {
  return `
**COMPONENTES DISPONÍVEIS DO SOMA V4:**
- SomaAccordion:
- SomaAccordionItem:
- SomaAccordionItemAction:
- SomaAutocomplete: O Autocomplete é um componente de filtragem de opções através de um campo de texto.
- SomaAutocompleteItem: O Soma Autocomplete Item é um componente de item de uma lista flutuante de opcões clicáveis quando é realizada alguma busca ou filtragem com o autocomplete.
- SomaAvatar: O Componente SomaAvatar é utilizado para mostrar uma imagem miniatura que representa um usuário da interface.
- SomaBackdrop: O componente \`SomaBackdrop\` tem por objetivo inserir um pano de fundo para a inserção de componentes em cima da tela, comumente utilizado no \`SomaModal\`.
- SomaBadgeNotification: O componente SomaBadgeNotification permite que os usuários sejam facilmente sinalizados por informação numérica.
- SomaBadgeRisk: O componente SomaBadgeRisk permite que os usuários sejam facilmente sinalizados por informação numérica.
- SomaBanner:
- SomaBannerItem:
- SomaBox:
- SomaButton: O componente SomaButton permite que os usuários tomem ações e decisões com um básico toque, eles comunicam ações que os usuários podem realizar.
- SomaButtonFileUpload: O Soma Button File Upload é um componente com objetivo de possibilitar a seleção de arquivos.
- SomaButtonIcon: O componente SomaButtonIcon possui o funcionamento semelhante ao SomaButton no qual permite que os usuários tomem ações e decisões com um básico toque, eles comunicam ações que os usuários podem realizar.
- SomaButtonLink: O Componente SomaButtonLink é uma âncora para a web e é baseado no elemento HTML \`<a></a>\` e indica sempre ações de click.
- SomaButtonValueShortcut: O componente SomaButtonValueShortcut permite que os usuários tomem ações e decisões com um básico toque, eles comunicam ações que os usuários podem realizar.
- SomaCalendar: O Calendar é um componente utilizado para captura de eventos e exibição de informação relacionadas ao calendário, o \`SomaCalendar\` suporta data-range por meio do type \`range\`.
- SomaCalendarDay: Component usando internamente pelo SomaCalendar.
- SomaCaption: O \`SomaCaption\` é um dos componentes de texto do soma.
- SomaCard: O componente \`SomaCard\` é utilizado para criar cards que podem conter conteúdo e ações relacionadas a um único tópico.
- SomaCardActions: O \`SomaCardActions\` contém as ações disponíveis em um \`SomaCard\`.
- SomaCardContent: O SomaCardContent é utilizado como container do conteúdo principal e seus respectivos elementos em um \`SomaCard\`.
- SomaCardHeader: O \`SomaCardHeader\` contém o título de um card e pode conter um ícone.
- SomaCardMedia: O \`SomaCardMedia\` é utilizado como container de mídia (imagem, vídeo) que pode ocupar todo o espaço de layout em um \`SomaCard\`.
- SomaCardMediaDescription: O SomaCardMediaDescription é utilizado para descrever o conteúdo de mídia (imagem, video), é utilizado juntamente com o \`SomaCardMedia\`.
- SomaChart:
- SomaChartDonut:
- SomaChartLine:
- SomaChartSinglebar:
- SomaChartSinglebarItem:
- SomaChartSinglebarLegend:
- SomaChartSinglebarLegendItem:
- SomaCheckbox: O Componente SomaCheckbox permite ao usuário selecionar um ou mais itens de um conjunto.
- SomaChipChoice: O SomaChipChoice deve ser utilizado para filtrar e exibir conteúdos na tela.
- SomaChipHighlight: O componente \`SomaChipHighlight\` é utilizado para destacar informações importantes dentro de um card ou item de lista.
- SomaChipStatus:
- SomaCoachmark:
- SomaCoachmarkAnchor:
- SomaCollapse: O SomaCollapse deve ser usado para fazer a separação horizontal ou vertical de conteúdos
- SomaContainer: O Soma Container faz parte dos componentes de Layout, é um componente utilizado em um sistema de grid.
- SomaContext: O Context é um componente de comportamento que irá gerenciar o contexto dos componentes aninhados.
- SomaCopyInfo:
- SomaCopyInfoItem:
- SomaDatepicker: O Datepicker é um componente utilizado para i/o de datas, o \`SomaDatepicker\` suporta range picker por meio do type \`range\`.
- SomaDatepickerAction:
- SomaDatepickerShortcut:
- SomaDescription: O \`SomaDescription\` é um dos componentes de texto do soma, voltado para descrição.
- SomaDivider: O SomaDivider deve ser usado para fazer a separação horizontal ou vertical de conteúdos
- SomaDrawer:
- SomaDrawerAction:
- SomaDrawerContent:
- SomaDrawerHeader:
- SomaFeedback:
- SomaFlag:
- SomaForm: Componente de formulário para gestão de todos os campos internos de um formulário.
- SomaGrid: O componente SomaGrid é um sistema de grid e pode receber uma série de linhas (SomaGridRow) e colunas (SomaGridCol).
- SomaGridCol: O componente SomaGridCol representa uma coluna de conteúdo dentro de um sistema de grid.
- SomaGridRow: O componente SomaGridRow representa uma linha de conteúdo dentro de um sistema de grid.
- SomaHeading: O \`SomaHeading\` é um dos componentes de texto do soma, voltado para cabeçalho.
- SomaHide: O Componente SomaHide é utilizado para ocultar conteúdos da tela em determinados breakpoints.
- SomaHideValuePassword: O componente \`SomaHideValuePassword\` permite o usuário a inserir sua senha no modelo padronizado pelos bancos.
- SomaIcon: Os ícones do Soma Web são carregados de maneira lazy.
- SomaIconStatus:
- SomaInputBankPassword: O componente \`SomaInputBankPassword\` permite o usuário a inserir sua senha no modelo padronizado pelos bancos.
- SomaItem: O componente \`SomaItem\` representa um componente para ser utilizado em listas e menus.
- SomaItemAction:
- SomaItemAvatar:
- SomaItemDivider:
- SomaItemLeading:
- SomaList: O componente \`SomaList\` representa uma lista contínua e vertical.
- SomaMenu:
- SomaMenuAnchor:
- SomaModal: O componente \`SomaModal\` fornece uma base sólida para criar componentes que sobressaem a tela do usuário.
- SomaModalAction:
- SomaModalContent:
- SomaModalHeader:
- SomaMonthCalendar:
- SomaMonthPicker:
- SomaMonthPickerAction:
- SomaPageControl:
- SomaPagination: O componente de paginação permite ao usuário navegar sobre páginas a partir de um intervalo.
- SomaParagraph: O \`SomaParagraph\` é um dos componentes de texto do soma, voltado para parágrafos.
- SomaPopper:
- SomaPopperAnchor:
- SomaProgressIndicatorBar: O componente SomaProgressIndicatorBar funciona como uma barra de progresso.
- SomaProgressIndicatorCircular: O SomaProgressIndicatorCircular é um loading giratório para exibir o estado de carregamento de uma página ou seção.
- SomaQuantity: O Soma Quantity incrementa ou decrementa valores númericos de forma intuitiva.
- SomaRadio: O componente SomaRadio permite o usuário selecionar uma das opções de um conjunto.
- SomaRadioGroup: O componente SomaRadioGroup permite o usuário a agrupar o SomaRadio e obter o comportamento nativo.
- SomaRating: O componente \`SomaRating\` permite que usuários forneçam feedback quantitativo através de uma classificação de estrelas.
- SomaRichTooltip:
- SomaRichTooltipAction:
- SomaRichTooltipAnchor:
- SomaSearch: O componente SomaSearch permite que os usuários digitem e editem texto com finalidade de busca.
- SomaSelect: Os componentes de seleção são usados para coletar informações fornecidas pelo usuário em uma lista de opções.
- SomaShortcut: O componente \`SomaShortcut\` é um atalho interativo utilizado para acessar produtos e serviços de forma rápida e eficiente.
- SomaSkeleton: Exiba uma visualização do espaço reservado de seu conteúdo antes que os dados sejam carregados.
- SomaSlider:
- SomaSnackbar: Snackbars fornecem mensagens breves sobre os processos de aplicativos.
- SomaSnackbarStatus: Snackbars fornecem mensagens breves sobre os processos de aplicativos.
- SomaSnackbarValidation: Snackbars fornecem mensagens breves sobre os processos de aplicativos.
- SomaSpacer: O SomaSpacer deve ser usado para fazer a separação horizontal ou vertical de conteúdos
- SomaStep:
- SomaStepper:
- SomaSubtitle: O \`SomaSubtitle\` é um dos componentes de texto do soma, voltado para subtítulo.
- SomaSwitch: O componente \`SomaSwitch\` alterna o estado de uma única configuração: ligado ou desligado.
- SomaSwitchText:
- SomaTab: O componente SomaTab é utilizado como container de media dentro de um \`SomaTabs\`.
- SomaTable:
- SomaTableBody:
- SomaTableCell:
- SomaTableCellAction:
- SomaTableFoot:
- SomaTableHead:
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
export function getCompleteSomaGuidelines(version = 4): string {
  return `
${getSomaRules()}

${getSomaComponents(version)}

${getCodeQualityGuidelines()}
`.trim();
}