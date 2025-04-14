import { OpenAIService } from '../services/OpenAIService';
// import { AgentContext } from './types';
import { ComponentGenerationRequest } from '../services/CodeGenerationService';

export class DeveloperAgent {
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.openAIService = openAIService;
  }

  async generateMainCode(request: ComponentGenerationRequest): Promise<string> {
    console.log('DeveloperAgent: Gerando código principal...');
    const systemPrompt = this.prepareComponentPrompt(request);
    const userContent = "Gerar o código conforme solicitado.";
    try {
      const generatedCode = await this.openAIService.generateCode(systemPrompt, userContent);
      console.log('DeveloperAgent: Código principal gerado (string bruta).');

      const codeMatch = generatedCode.match(/```(?:tsx?|ts|javascript)?\s*([\s\S]*?)```/);
      const finalCode = codeMatch ? codeMatch[1].trim() : generatedCode;

      return finalCode;
    } catch (error) {
      console.error('DeveloperAgent: Erro ao gerar código principal:', error);
      throw new Error('Falha na geração do código principal pelo DeveloperAgent.');
    }
  }

  private prepareComponentPrompt(request: ComponentGenerationRequest): string {
    const componentName = request.name.charAt(0).toUpperCase() + request.name.slice(1);

    let prompt = `Aja como um Engenheiro Frontend Sênior especialista em React, TypeScript e no Design System "Soma".
Sua tarefa é desenvolver um artefato React (${request.type}) chamado "${componentName}" baseado na seguinte descrição: ${request.description}.

**FOCO PRINCIPAL:** Gere APENAS o código principal e funcional do arquivo ${request.type === 'hook' ? `use${componentName}.ts` : request.type === 'service' ? `${componentName}Service.ts` : `${componentName}.tsx`} (ou ${componentName}Page.tsx para páginas).
NÃO inclua arquivos de teste, CSS Modules ou index.ts nesta resposta. Foque 100% na implementação do código solicitado.

**REGRAS DO DESIGN SYSTEM SOMA (OBRIGATÓRIAS):**
- **USE SOMENTE COMPONENTES SOMA:** Utilize exclusivamente componentes do Design System Soma importados de '@soma/react'. A lista de componentes disponíveis está abaixo.
- **HTML NATIVO:** Use elementos HTML nativos SOMENTE se não houver um componente Soma adequado. Se usar HTML nativo, estilize-o minimamente (apenas layout/espaçamento) ou indique a necessidade de um CSS Module.
- **TIPOGRAFIA SOMA:** Prefira os componentes de tipografia Soma (SomaHeading, SomaSubtitle, SomaParagraph, etc.) em vez de tags HTML.
- **ÍCONES SOMA:** Use SEMPRE o componente 'SomaIcon'. Assuma acesso a uma lista completa de ícones Soma.
- **ESTILIZAÇÃO:** Permita apenas redimensionamento e posicionamento em componentes Soma. Use SOMENTE 'px' ou '%'. Foque em bom espaçamento, uso de cores (do DS) e hierarquia visual.
- **DOCUMENTAÇÃO:** Assuma que você consultou a documentação dos componentes Soma.
- **EXPORTAÇÃO:** Exporte o componente/hook/serviço principal como default.
- **QUALIDADE:** Gere código React moderno, limpo, legível, funcional e bem tipado (TypeScript).

**DESCRIÇÃO DETALHADA DO QUE FAZER:**
${request.description}

**REQUISITOS ESPECÍFICOS PARA O TIPO '${request.type}':**
`;

    switch (request.type) {
      case 'component':
        prompt += `- Implemente o componente funcional React com TypeScript.\n- Use tipos TypeScript para props.\n- Foque na lógica e estrutura do componente.\n- Indique com comentários onde CSS Modules seriam necessários para elementos HTML nativos (Ex: /* Estilizar este div com ${componentName}.module.css */).\n`;
        break;
      case 'hook':
        prompt += `- Implemente o hook React com TypeScript no arquivo use${componentName}.ts.\n- Garanta que o nome do hook siga a convenção 'use'.\n- Inclua tipos claros para parâmetros e retorno.\n`;
        break;
      case 'service':
        prompt += `- Implemente a classe de serviço com TypeScript no arquivo ${componentName}Service.ts.\n- Defina métodos claros e bem tipados.\n- Use injeção de dependência no construtor se necessário (ex: para outros serviços).\n`;
        break;
      case 'page':
        prompt += `- Implemente a página como um componente funcional React com TypeScript no arquivo ${componentName}Page.tsx.\n- Estruture a página pensando em layout (SomaGrid), responsividade e usabilidade.\n- Indique com comentários onde CSS Modules seriam necessários (Ex: /* Estilizar este section com ${componentName}Page.module.css */).\n`;
        break;
    }

    prompt += `
**LISTA DE COMPONENTES SOMA DISPONÍVEIS (@soma/react):**
- SomaAccordion, SomaAccordionFooter, SomaAccordionHeader, SomaAccordionItem, SomaAlert, SomaAutocomplete, SomaAutocompleteItem, SomaAvatar, SomaBackdrop, SomaBadge, SomaBanner, SomaBannerItem, SomaButton, SomaButtonLink, SomaCalendar, SomaCalendarDay, SomaCaption, SomaCard, SomaCardActions, SomaCardContent, SomaCardHeader, SomaCardMedia, SomaCardMediaDescription, SomaCheckbox, SomaChip, SomaContainer, SomaContext, SomaDatepicker, SomaDescription, SomaDialog, SomaDialogWarning, SomaDivider, SomaDrawer, SomaDrawerAction, SomaDrawerContent, SomaDrawerHeader, SomaForm, SomaGrid, SomaGridCol, SomaGridRow, SomaHeading, SomaHide, SomaIcon, SomaIconButton, SomaInputBankPassword, SomaLink, SomaList, SomaListItem, SomaListItemAction, SomaMenu, SomaMenuAnchor, SomaMenuItem, SomaModal, SomaOption, SomaPagination, SomaParagraph, SomaPopover, SomaPopoverContent, SomaPopper, SomaPopperContent, SomaProgress, SomaQuantity, SomaRadio, SomaRadioGroup, SomaRating, SomaSearch, SomaSelect, SomaShortcut, SomaSkeleton, SomaSmartForm, SomaSnackbar, SomaSpinner, SomaStepper, SomaStep, SomaSubtitle, SomaSwitch, SomaSwitchText, SomaTab, SomaTable, SomaTableBody, SomaTableCell, SomaTableCollapse, SomaTableHead, SomaTableRow, SomaTabs, SomaTextField, SomaTextarea, SomaTimePicker, SomaTooltip, SomaUpload, SomaUploadDraggable, SomaUploadList, SomaUploadListItem

**FORMATO DE SAÍDA:**
Responda APENAS com o código TypeScript/TSX solicitado, dentro de um único bloco de código markdown.
Exemplo:
\`\`\`tsx
// Código do componente aqui...
export default ${componentName};
\`\`\`
NÃO inclua explicações fora do bloco de código.
`;

    return prompt;
  }
}
