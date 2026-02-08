import "./_setup";
import { describe, it, expect } from "vitest";
import nock from "nock";

import { AxiosHttpClient } from "../../src/http/AxiosHttpClient";
import { TokenCache } from "../../src/auth/TokenCache";
import { OAuthClient } from "../../src/auth/OAuthClient";
import { UpsCarrier } from "../../src/carriers/ups/UpsCarrier";
import { AppError } from "../../src/domain/errors";
import type { RateRequest } from "../../src/domain/models";

function makeCarrier(baseUrl = "https://wwwcie.ups.com", version = "v2409") {
  const http = new AxiosHttpClient();
  const cache = new TokenCache();
  const auth = new OAuthClient(http, `${baseUrl}/security/v1/oauth/token`, "id", "secret", cache);
  const carrier = new UpsCarrier(http, auth, { baseUrl, version, timeoutMs: 15000 });
  return { carrier, baseUrl, version };
}

    const req = {
      shipper: { countryCode: "US", postalCode: "10001" },
      recipient: { countryCode: "US", postalCode: "94105" },
      packages: [{ weight: { value: 1, unit: "LB" } }],
    } satisfies RateRequest;

describe("UPS error handling", () => {
  it("maps 429 to RATE_LIMITED", async () => {
    const { carrier, baseUrl, version } = makeCarrier();

    nock(baseUrl).post("/security/v1/oauth/token").reply(200, { access_token: "T", expires_in: 3600 });
    nock(baseUrl).post(`/rating/${version}/Shop`).reply(429, { response: { errors: [{ code: "RATELIMIT", message: "Too many requests" }] } });

    await expect(carrier.getRates(req)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      retryable: true,
    });
  });

  it("maps 401/403 to AUTH_ERROR", async () => {
    const { carrier, baseUrl, version } = makeCarrier();

    nock(baseUrl).post("/security/v1/oauth/token").reply(200, { access_token: "T", expires_in: 3600 });
    nock(baseUrl).post(`/rating/${version}/Shop`).reply(401, { response: { errors: [{ code: "AUTH", message: "Unauthorized" }] } });

   await expect(carrier.getRates(req)).rejects.toMatchObject({
      code: "AUTH_ERROR",
      status: 401,
      retryable: true,
    });
  });

  it("maps 5xx to UPSTREAM_ERROR (retryable)", async () => {
    const { carrier, baseUrl, version } = makeCarrier();

    nock(baseUrl).post("/security/v1/oauth/token").reply(200, { access_token: "T", expires_in: 3600 });
    nock(baseUrl).post(`/rating/${version}/Shop`).reply(500, { response: { errors: [{ code: "SERVER", message: "oops" }] } });

    await expect(carrier.getRates(req)).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
      status: 500,
      retryable: true,
    });
  });

  it("maps malformed success JSON to MALFORMED_RESPONSE", async () => {
    const { carrier, baseUrl, version } = makeCarrier();

    nock(baseUrl).post("/security/v1/oauth/token").reply(200, { access_token: "T", expires_in: 3600 });
    // Missing RateResponse.RatedShipment
    nock(baseUrl).post(`/rating/${version}/Shop`).reply(200, { RateResponse: { nope: true } });

    await expect(carrier.getRates(req)).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });
});
