import { OpenAIService } from '../services/openAIService';
import { AgentResponse, ComponentSpec, ServiceSpec } from '../types/agents';

export class DevAgent {
    private static readonly SYSTEM_PROMPT = `You are an expert React developer specializing in creating modern, accessible, and secure components.
Your role is to implement components and services based on detailed specifications.
Focus on:
- Clean and maintainable code
- TypeScript best practices
- React hooks and functional components
- Proper error handling
- Input validation and security
- Performance optimization
- Unit test coverage
- Documentation

Generate code in markdown format with file names as comments, following this structure:
\`\`\`typescript
// components/ComponentName.tsx
// Component implementation
\`\`\`

\`\`\`typescript
// services/ServiceName.ts
// Service implementation
\`\`\`

\`\`\`typescript
// types/Types.ts
// Type definitions
\`\`\``;

    constructor(private readonly openAIService: OpenAIService) {}

    async generateCode(specs: { components: ComponentSpec[], services: ServiceSpec[] }): Promise<AgentResponse> {
        try {
            const prompt = `${DevAgent.SYSTEM_PROMPT}

Implementation Specifications:
${JSON.stringify(specs, null, 2)}

Generate the complete implementation for all components and services, including:
1. React components with TypeScript
2. Service layer with API integration
3. Type definitions
4. Styling (CSS modules or styled-components)
5. Unit test files
6. README with usage examples`;

            const response = await this.openAIService.generateCode(prompt);

            // Verifica se a resposta contém código em markdown
            if (!response.includes('```typescript') && !response.includes('```tsx')) {
                return {
                    success: false,
                    content: '',
                    error: 'Resposta não contém código válido'
                };
            }

            return {
                success: true,
                content: response
            };
        } catch (error) {
            return {
                success: false,
                content: '',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
        }
    }
}
