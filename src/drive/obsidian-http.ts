import type { FetchLike } from "./auth";

export interface ObsidianRequestUrlResponseLike {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly arrayBuffer: ArrayBuffer;
}
export interface ObsidianRequestUrlLike {
  (request: { readonly url: string; readonly method?: string; readonly headers?: Record<string,string>; readonly body?: string | ArrayBuffer }): Promise<ObsidianRequestUrlResponseLike>;
}

function headerRecord(headers: HeadersInit | undefined): Record<string,string> {
  const record: Record<string,string> = {};
  new Headers(headers).forEach((value,key) => { record[key] = value; });
  return record;
}
function requestBody(body: BodyInit | null | undefined): string | ArrayBuffer | undefined {
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  throw new Error("unsupported-obsidian-request-url-body");
}

export function createObsidianRequestUrlFetcher(requestUrl: ObsidianRequestUrlLike): FetchLike {
  return async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const result = await requestUrl({ url, method: init.method, headers: headerRecord(init.headers), body: requestBody(init.body) });
    return new Response(result.arrayBuffer, { status: result.status, headers: result.headers });
  };
}
