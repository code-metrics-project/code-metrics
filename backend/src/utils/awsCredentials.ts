import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { buildQueryString } from "@smithy/querystring-builder";
import { type HttpHandler, HttpResponse } from "@smithy/protocol-http";
import { type HttpHandlerOptions } from "@smithy/types";
import { Agent as HttpAgent, request as httpRequest } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

type AwsStaticCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

type AwsStaticCredentialConfig = {
  credentials: AwsStaticCredentials;
  credentialDefaultProvider: () => () => Promise<AwsStaticCredentials>;
  defaultUserAgentProvider?: () => Promise<Array<[string, string?]>>;
  defaultsMode?: "standard";
  requestHandler?: HttpHandler;
};

type AwsStaticCredentialOptions = {
  preferNodeHttpHandler?: boolean;
};

class StaticNodeHttpHandler implements HttpHandler {
  readonly metadata = { handlerProtocol: "http/1.1" };

  private readonly httpAgent = new HttpAgent({ keepAlive: true, maxSockets: 50 });

  private readonly httpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 50 });

  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }

  async handle(request, { abortSignal, requestTimeout }: HttpHandlerOptions = {}) {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(Object.assign(new Error("Request aborted"), { name: "AbortError" }));
        return;
      }

      const isSsl = request.protocol === "https:";
      const queryString = request.query ? buildQueryString(request.query) : "";
      const auth =
        request.username != null || request.password != null ? `${request.username ?? ""}:${request.password ?? ""}` : undefined;
      const hostname = request.hostname?.startsWith("[") && request.hostname.endsWith("]")
        ? request.hostname.slice(1, -1)
        : request.hostname;

      let path = request.path;
      if (queryString) {
        path += `?${queryString}`;
      }
      if (request.fragment) {
        path += `#${request.fragment}`;
      }

      const req = (isSsl ? httpsRequest : httpRequest)(
        {
          headers: request.headers,
          host: hostname,
          method: request.method,
          path,
          port: request.port,
          agent: isSsl ? this.httpsAgent : this.httpAgent,
          auth,
        },
        (response) => {
          resolve({
            response: new HttpResponse({
              statusCode: response.statusCode || -1,
              reason: response.statusMessage,
              headers: response.headers,
              body: response,
            }),
          });
        },
      );

      req.on("error", reject);

      if (requestTimeout) {
        req.setTimeout(requestTimeout, () => {
          req.destroy(Object.assign(new Error(`Request timed out after ${requestTimeout} ms.`), { name: "TimeoutError" }));
        });
      }

      const abortListener = () => {
        req.destroy(Object.assign(new Error("Request aborted"), { name: "AbortError" }));
      };
      abortSignal?.addEventListener("abort", abortListener, { once: true });
      req.on("close", () => abortSignal?.removeEventListener("abort", abortListener));

      const { body } = request;
      if (body instanceof Readable) {
        body.pipe(req);
        return;
      }
      if (body == null) {
        req.end();
        return;
      }
      if (Buffer.isBuffer(body) || typeof body === "string") {
        req.end(body);
        return;
      }
      if (typeof body === "object" && "buffer" in body && "byteOffset" in body && "byteLength" in body) {
        req.end(Buffer.from(body.buffer, body.byteOffset, body.byteLength));
        return;
      }
      req.end(Buffer.from(body));
    });
  }
}

const isJestRuntime = () => typeof process.env.JEST_WORKER_ID !== "undefined";

export const getStaticAwsCredentialConfig = (
  accessKeyId?: string | null,
  secretAccessKey?: string | null,
  sessionToken?: string | null,
  options: AwsStaticCredentialOptions = {},
): AwsStaticCredentialConfig | Record<string, never> => {
  if (!accessKeyId || !secretAccessKey) {
    return {};
  }

  const credentials: AwsStaticCredentials = {
    accessKeyId,
    secretAccessKey,
    ...(sessionToken ? { sessionToken } : {}),
  };

  return {
    credentials,
    credentialDefaultProvider: () => async () => credentials,
    ...(isJestRuntime()
      ? {
          defaultUserAgentProvider: async () => [],
          defaultsMode: "standard" as const,
          requestHandler: options.preferNodeHttpHandler ? new StaticNodeHttpHandler() : new FetchHttpHandler(),
        }
      : {}),
  };
};
