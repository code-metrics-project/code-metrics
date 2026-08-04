type RequestInit = globalThis.RequestInit;
import Bottleneck from "bottleneck";

const bottleneckBitbucketServer = new Bottleneck({
  maxConcurrent: 50,
  minTime: 100,
});

async function unlimitedBitbucketFetch<ResponseType>(
  url: URL | string,
  options: RequestInit,
  JSONResponse = true,
): Promise<ResponseType> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  return JSONResponse ? response.json() : response.text();
}

export async function limitedBitbucketFetch<ResponseType>(
  url: URL | string,
  options: RequestInit,
  JSONResponse = true,
): Promise<ResponseType> {
  return bottleneckBitbucketServer.schedule(() => unlimitedBitbucketFetch(url, options, JSONResponse));
}
