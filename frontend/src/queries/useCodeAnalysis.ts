import { useMutation } from "@tanstack/react-query";
import client from "@/api/client";
import { CODE_ANALYSIS_AGGREGATE } from "@/api/endpoints";

export interface CodeAnalysisRequest {
  workloads: string[];
  repoGroups?: string[];
  repos?: string[];
  startDate?: string;
  endDate?: string;
  aggregate?: boolean;
}

export interface CodeAnalysisSummary {
  coverage: number;
  totalLines: number;
  totalLinesToCover: number;
  uncoveredLines?: number;
}

export interface CodeAnalysisResult {
  name: string;
  workloadId: string;
  hasMetrics?: boolean;
  numProjects: number;
  summary: CodeAnalysisSummary;
  delta?: number;
  variant?: string;
  staleData?: string;
  analysisLinks?: {
    title: string;
    repoName: string;
    url: string;
  }[];
  // Legacy field name - some responses use 'links'
  links?: {
    title: string;
    workloadId: string;
    repoName: string;
    codeAnalysisUrl: string;
  }[];
}

export interface CodeAnalysisResponse {
  current: CodeAnalysisResult[];
  previous: CodeAnalysisResult[];
}

async function fetchCodeAnalysis(request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
  const response = await client.post<CodeAnalysisResponse>(CODE_ANALYSIS_AGGREGATE, request);
  return response.data;
}

export function useCodeAnalysis() {
  return useMutation({
    mutationFn: fetchCodeAnalysis,
  });
}
