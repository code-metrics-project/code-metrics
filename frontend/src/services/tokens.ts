import client from "@/api/client";
import { SERVICE_TOKENS, SERVICE_TOKEN } from "@/api/endpoints";

export interface ServiceToken {
  tokenId: string;
  sub: string;
  created: string;
  expires: string;
  createdBy: string;
}

export interface CreateTokenResponse {
  accessToken: string;
  tokenInfo: ServiceToken;
}

export async function listServiceTokens(): Promise<ServiceToken[]> {
  try {
    const response = await client.get<ServiceToken[]>(SERVICE_TOKENS);
    return response.data;
  } catch (error) {
    console.error("Failed to load service tokens:", error);
    throw error;
  }
}

export async function createServiceToken(subject: string): Promise<CreateTokenResponse> {
  try {
    const response = await client.post<CreateTokenResponse>(SERVICE_TOKENS, {
      subject,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to create service token:", error);
    throw error;
  }
}

export async function revokeServiceToken(tokenId: string): Promise<void> {
  try {
    await client.delete(SERVICE_TOKEN(tokenId));
  } catch (error) {
    console.error("Failed to revoke service token:", error);
    throw error;
  }
}
