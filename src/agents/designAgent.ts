import { OpenAIService } from '../services/openAIService';
import { AgentResponse, ComponentSpec, ServiceSpec } from '../types/agents';

export class DesignAgent {
    private static readonly SYSTEM_PROMPT = `You are an expert UI/UX designer specializing in React components and application architecture.
Your role is to analyze user requirements and create detailed specifications for components and services.
Focus on:
- Modern and accessible UI/UX patterns
- Component structure and hierarchy
- Props and state management
- Styling guidelines and themes
- Service architecture and API integration
- Security best practices
- Performance considerations

Provide specifications in a structured JSON format with detailed descriptions.`;

    constructor(private readonly openAIService: OpenAIService) {}

    async analyzeRequirements(request: string): Promise<AgentResponse> {
        try {
            const prompt = `${DesignAgent.SYSTEM_PROMPT}

User Request: ${request}

Create detailed specifications for all necessary components and services.
Include:
1. Component specifications (name, description, props, styles, features)
2. Service specifications (name, methods, parameters, return types)
3. Dependencies and requirements

Response should be in the following format:
{
    "components": [ComponentSpec],
    "services": [ServiceSpec]
}`;

            const response = await this.openAIService.generateCode(prompt);
            
            try {
                // Valida se a resposta é um JSON válido
                const specs = JSON.parse(response);
                if (!specs.components || !specs.services) {
                    throw new Error('Especificação inválida');
                }

                return {
                    success: true,
                    content: response
                };
            } catch (error) {
                return {
                    success: false,
                    content: '',
                    error: 'Falha ao analisar especificação do componente'
                };
            }
        } catch (error) {
            return {
                success: false,
                content: '',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }
}

export interface DesignOutput {
    componentType: string;
    fields: Array<{ name: string, type: string, placeholder: string, toggle?: boolean }>;
    validations: { [key: string]: any };
    service: { apiEndpoint: string };
}
