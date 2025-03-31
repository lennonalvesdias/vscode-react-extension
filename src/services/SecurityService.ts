import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { OpenAIService } from './OpenAIService';
import { AgentContext } from '../agents/types';

interface SecurityCheck {
  recommendations: string[];
  issues: string[];
  score: number;
  vulnerabilities: string[];
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export class SecurityService {
  private openAIService: OpenAIService;

  constructor(private context: AgentContext) {
    this.openAIService = new OpenAIService(context);
  }

  async checkSecurity(analysis: any): Promise<SecurityCheck> {
    try {
      const prompt = this.buildPrompt(analysis);
      const response = await this.openAIService.analyzeSecurity(prompt);

      return this.parseSecurity(response);
    } catch (error) {
      throw new Error(`Erro na análise de segurança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private buildPrompt(analysis: any): string {
    return `
            Analise a segurança do seguinte componente:

            Tipo: ${analysis.componentType}
            Nome: ${analysis.suggestedName}
            Requisitos: ${analysis.requirements.join(', ')}
            Descrição: ${analysis.description}

            Verifique:
            1. Vulnerabilidades
            2. Injeção de código
            3. XSS
            4. CSRF
            5. Autenticação
            6. Autorização
            7. Validação de dados
            8. Sanitização
        `;
  }

  private parseSecurity(response: string): SecurityCheck {
    // Implementa a lógica de parsing da resposta
    const lines = response.split('\n');
    const security: SecurityCheck = {
      recommendations: [],
      issues: [],
      score: 0,
      vulnerabilities: []
    };

    for (const line of lines) {
      if (line.toLowerCase().includes('recomendação:')) {
        security.recommendations.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('problema:')) {
        security.issues.push(line.split(':')[1].trim());
      }
      else if (line.toLowerCase().includes('score:')) {
        const score = parseInt(line.split(':')[1].trim());
        if (!isNaN(score)) {
          security.score = score;
        }
      }
      else if (line.toLowerCase().includes('vulnerabilidade:')) {
        security.vulnerabilities.push(line.split(':')[1].trim());
      }
    }

    return security;
  }

  async secureStore(key: string, value: string): Promise<void> {
    const encrypted = this.encrypt(value);
    await this.context.globalState.update(key, encrypted);
  }

  async secureRetrieve(key: string): Promise<string | undefined> {
    const encrypted = this.context.globalState.get<string>(key);
    if (!encrypted) { return undefined; }
    return this.decrypt(encrypted);
  }

  async secureDelete(key: string): Promise<void> {
    await this.context.globalState.update(key, undefined);
  }

  sanitizeInput(input: string): string {
    // Remove caracteres potencialmente perigosos
    return input.replace(/[<>]/g, '');
  }

  validateCode(code: string): boolean {
    // Verifica padrões perigosos no código
    const dangerousPatterns = [
      /eval\s*\(/i,
      /new\s+Function\s*\(/i,
      /localStorage/i,
      /document\.cookie/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(code));
  }

  logAudit(action: string, details: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      ...details
    };

    // Aqui você pode implementar a lógica de logging adequada
    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    const [ivHex, authTagHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  sanitizeCode(code: string): string {
    // Remove comentários maliciosos
    code = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // Sanitiza inputs
    code = this.sanitizeInputs(code);

    // Remove imports suspeitos
    code = this.removeSuspiciousImports(code);

    return code;
  }

  private sanitizeInputs(code: string): string {
    // Escapa caracteres especiais em strings
    return code.replace(/(['"])((?:\\\1|.)*?)\1/g, (match, quote, content) => {
      return quote + content.replace(/[<>&'"]/g, (char: string) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          "'": '&#39;',
          '"': '&quot;'
        };
        return entities[char];
      }) + quote;
    });
  }

  private removeSuspiciousImports(code: string): string {
    const suspiciousModules = [
      'child_process',
      'fs',
      'path',
      'crypto',
      'http',
      'https',
      'net'
    ];

    return code.replace(
      new RegExp(`import.*?{.*?(${suspiciousModules.join('|')}).*?}.*?from.*?['"].*?['"]`, 'g'),
      ''
    );
  }
}
