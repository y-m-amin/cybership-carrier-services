import type { HttpClient } from "../http/HttpClient";
import { AppError } from "../domain/errors";

export class OAuthClient {
  constructor(
    private http: HttpClient,
    private tokenUrl: string,
    private clientId: string,
    private clientSecret: string,
    private cache: { getValid(): string | null; set(t: string, exp: number): void; clear(): void },
  ) {}

  async getAccessToken(): Promise<string> {
    const cached = this.cache.getValid();
    if (cached) return cached;

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const res = await this.http.request<any>({
      method: "POST",
      url: this.tokenUrl,
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: "grant_type=client_credentials",
      timeoutMs: 10_000,
    });

    if (res.status === 429) throw new AppError({ code: "RATE_LIMITED", message: "OAuth rate limited", status: 429, retryable: true });
    if (res.status === 401 || res.status === 403) throw new AppError({ code: "AUTH_ERROR", message: "OAuth unauthorized", status: res.status, retryable: true });
    if (res.status >= 400) throw new AppError({ code: "AUTH_ERROR", message: "OAuth token request failed", status: res.status, retryable: res.status >= 500, details: res.data });

    const accessToken = res.data?.access_token;
    const expiresIn = res.data?.expires_in;

    if (typeof accessToken !== "string" || typeof expiresIn !== "number") {
      throw new AppError({ code: "MALFORMED_RESPONSE", message: "Invalid OAuth token response", details: res.data });
    }

    this.cache.set(accessToken, expiresIn);
    return accessToken;
  }
}
