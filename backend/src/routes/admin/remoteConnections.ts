import { Request, Response } from "express";
import { checkVcsConnections } from "../../services/codeManagement/vcsService";
import { checkPipelineConnections } from "../../services/pipelines/pipelinesService";
import { checkCodeAnalysisConnections } from "../../services/codeAnalysis/codeAnalysisService";
import { checkTicketConnections } from "../../services/tickets/ticketService";
import { checkLlmConnections } from "../../services/llm/llmService";
import { RemoteConnectionsResponse } from "../../model/remote-connection-status";

/**
 * GET /api/admin/remote-connections
 * Check connectivity to all configured remote servers and return their status.
 * Requires admin role.
 */
export const checkRemoteConnections = async (_req: Request, res: Response<RemoteConnectionsResponse>): Promise<void> => {
  // Run all connection checks in parallel for performance
  const [vcs, pipelines, codeAnalysis, tickets, llm] = await Promise.all([
    checkVcsConnections(),
    checkPipelineConnections(),
    checkCodeAnalysisConnections(),
    checkTicketConnections(),
    checkLlmConnections(),
  ]);

  // Aggregate all results
  const results = [...vcs, ...pipelines, ...codeAnalysis, ...tickets, ...llm];

  res.status(200).json({
    results,
    checkedAt: new Date().toISOString(),
  });
};
