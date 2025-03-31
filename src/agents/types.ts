import * as vscode from 'vscode';

export interface AgentMessage {
  role: 'user' | 'assistant';
  type: 'request' | 'response' | 'error';
  content: string;
  metadata?: Record<string, any>;
}

export interface Agent {
  name: string;
  description: string;
  process(message: AgentMessage): Promise<AgentMessage>;
}

export interface AgentContext {
  extensionUri: vscode.Uri;
  extensionPath: string;
  globalState: vscode.Memento;
  workspaceState: vscode.Memento;
  configuration?: vscode.WorkspaceConfiguration;
}

export interface AnalysisResult {
  score: number;
  suggestions: string[];
  issues: string[];
}

export interface CodeGenerationResult {
  code: string;
  explanation: string;
  dependencies: string[];
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
