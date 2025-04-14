import * as vscode from 'vscode';

export interface AgentMessage {
  role: 'user' | 'assistant';
  type: 'request' | 'response' | 'error';
  content: string;
  metadata?: any;
}

export interface Agent {
  name: string;
  description: string;
  process(message: AgentMessage): Promise<AgentMessage>;
}

export interface AgentContext {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  extensionUri: vscode.Uri;
  extensionPath: string;
  globalState: vscode.Memento;
  workspaceState: vscode.Memento;
  configuration?: vscode.WorkspaceConfiguration;
  provider?: 'openai' | 'azure';
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
}

export interface AnalysisResult {
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  risks: string[];
  recommendations: string[];
  type?: 'component' | 'hook' | 'service' | 'page';
  name?: string;
  description?: string;
  relatedComponents?: Array<{
    type: 'component' | 'hook' | 'service' | 'page';
    name: string;
    purpose?: string;
  }>;
}

export interface CodeGenerationResult {
  code: string;
  dependencies: string[];
  documentation: string;
  tests: string[];
}

export interface DesignSystemCompliance {
  isCompliant: boolean;
  violations: string[];
  suggestions: string[];
}

export interface BusinessAlignment {
  isAligned: boolean;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
}
