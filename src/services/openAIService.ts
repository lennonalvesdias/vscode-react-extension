import axios from 'axios';
import { OPENAI_CONFIG } from '../configuration';

export class OpenAIService {
    private static readonly API_URL = 'https://api.openai.com/v1/chat/completions';

    constructor(private readonly apiKey: string) {}

    async generateCode(prompt: string): Promise<string> {
        try {
            const response = await axios.post(
                OpenAIService.API_URL,
                {
                    model: OPENAI_CONFIG.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an AI assistant specialized in software development, focusing on React and TypeScript.
Your responses should be clear, well-structured, and follow modern development best practices.
When generating code:
- Use TypeScript for type safety
- Follow React best practices and hooks
- Implement proper error handling
- Include input validation
- Consider security implications
- Add JSDoc comments for documentation
- Use modern ES6+ features
- Consider accessibility (WCAG guidelines)
- Follow clean code principles
- Include proper error boundaries
- Implement proper state management
- Use proper dependency injection
- Follow the Single Responsibility Principle
- Include proper loading and error states
- Use proper form validation
- Implement proper security measures
- Use proper testing practices`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: OPENAI_CONFIG.TEMPERATURE,
                    max_tokens: OPENAI_CONFIG.MAX_TOKENS
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Falha ao gerar código com OpenAI: ${error.response?.data?.error?.message || error.message}`);
            }
            throw new Error('Falha ao gerar código com OpenAI');
        }
    }
} 