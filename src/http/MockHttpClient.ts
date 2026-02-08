import type { HttpClient, HttpRequest, HttpResponse } from "./HttpClient";

export class MockHttpClient implements HttpClient {
  constructor(
    private handlers: Array<{
      match: (req: HttpRequest) => boolean;
      handle: (req: HttpRequest) => Promise<HttpResponse> | HttpResponse;
    }>
  ) {}

  async request<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
    const h = this.handlers.find((x) => x.match(req));
    if (!h) {
      throw new Error(`No mock handler matched: ${req.method} ${req.url}`);
    }
    const res = await h.handle(req);
    return res as HttpResponse<T>;
  }
}
