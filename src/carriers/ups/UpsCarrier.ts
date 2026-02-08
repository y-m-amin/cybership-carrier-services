import type { Carrier } from "../Carrier";
import type { RateRequest, RateResponse } from "../../domain/models";
import { RateRequestSchema } from "../../domain/schemas";
import { AppError } from "../../domain/errors";
import type { HttpClient } from "../../http/HttpClient";
import { OAuthClient } from "../../auth/OAuthClient";
import { buildUpsRateUrl } from "./upsEndpoints";
import { buildUpsRateRequestBody, normalizeUpsRateResponse } from "./upsMapper";
import { UpsRateResponseSchema } from "./upsSchemas";

export class UpsCarrier implements Carrier {
  constructor(
    private http: HttpClient,
    private auth: OAuthClient,
    private config: { baseUrl: string; version: string; timeoutMs: number; transactionSrc?: string },
  ) {}

  async getRates(req: RateRequest): Promise<RateResponse> {
    const parsed = RateRequestSchema.safeParse(req);
    if (!parsed.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Invalid rate request",
        details: parsed.error.flatten(),
      });
    }

    const token = await this.auth.getAccessToken();

    const requestOption = parsed.data.serviceLevel ? "Rate" : "Shop";
    const url = buildUpsRateUrl({
      baseUrl: this.config.baseUrl,
      version: this.config.version,
      requestOption,
    });

    const body = buildUpsRateRequestBody(parsed.data);

    const res = await this.http.request({
      method: "POST",
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // docs show transId/transactionSrc headers; not required but good practice
        transactionSrc: this.config.transactionSrc ?? "testing",
      },
      data: body,
      timeoutMs: this.config.timeoutMs,
    });

    if (res.status === 429) throw new AppError({ code: "RATE_LIMITED", message: "UPS rate limit exceeded", status: 429, retryable: true });
    if (res.status === 401 || res.status === 403) throw new AppError({ code: "AUTH_ERROR", message: "UPS unauthorized", status: res.status, retryable: true });
    if (res.status >= 400) throw new AppError({ code: "UPSTREAM_ERROR", message: "UPS request failed", status: res.status, retryable: res.status >= 500, details: res.data });

    const valid = UpsRateResponseSchema.safeParse(res.data);
    if (!valid.success) {
      throw new AppError({ code: "MALFORMED_RESPONSE", message: "UPS response schema mismatch", details: valid.error.flatten() });
    }

    return normalizeUpsRateResponse(valid.data, parsed.data.serviceLevel);
  }
}
