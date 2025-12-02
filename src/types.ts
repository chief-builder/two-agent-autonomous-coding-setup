/**
 * Type definitions for the autonomous coding agent
 */

export interface Feature {
  id: string;
  category: string;
  description: string;
  testSteps: string[];
  passes: boolean;
}

export interface FeatureList {
  appName: string;
  features: Feature[];
  metadata?: {
    createdAt: string;
    lastUpdated: string;
    totalFeatures: number;
    passingFeatures: number;
  };
}

export interface ProgressInfo {
  passing: number;
  total: number;
}

export interface AgentConfig {
  projectDir: string;
  model: string;
  maxIterations?: number;
  specFile?: string;
  enhanceMode?: boolean;
}

export interface SessionResult {
  shouldContinue: boolean;
  error?: string;
}

export type SecurityHookResult = {
  allowed: boolean;
  reason?: string;
};
