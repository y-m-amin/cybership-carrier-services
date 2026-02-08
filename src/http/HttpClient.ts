export type HttpRequest = {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  data?: unknown;
};

export type HttpResponse<T = unknown> = {
  status: number;
  data: T;
  headers?: Record<string, string>;
};

export interface HttpClient {
  request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}
