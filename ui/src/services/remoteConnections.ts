import { client } from "../utils/apiClient";
import { ADMIN_REMOTE_CONNECTIONS } from "../utils/urls";

export type ConnectionStatus = "connected" | "unreachable" | "unauthorised" | "error" | "unconfigured" | "rateLimited";

export interface ConnectionCheckResult {
  id: string;
  category: string;
  type: string;
  url?: string;
  status: ConnectionStatus;
  statusDetail?: string;
  responseTimeMs?: number;
}

export interface RemoteConnectionsResponse {
  results: ConnectionCheckResult[];
  checkedAt: string;
}

export async function checkRemoteConnections(): Promise<RemoteConnectionsResponse> {
  try {
    const response = await client.get<RemoteConnectionsResponse>(ADMIN_REMOTE_CONNECTIONS);
    return response.data;
  } catch (error) {
    console.error("Failed to check remote connections:", error);
    throw error;
  }
}
