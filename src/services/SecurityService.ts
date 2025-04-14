export class SecurityService {
  logAudit(action: string, details: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      ...details
    };
    console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
  }
}
