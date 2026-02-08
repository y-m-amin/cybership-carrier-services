import "./_setup";
import { describe, it, expect } from "vitest";
import nock from "nock";
import { AxiosHttpClient } from "../../src/http/AxiosHttpClient";
import { TokenCache } from "../../src/auth/TokenCache";
import { OAuthClient } from "../../src/auth/OAuthClient";
import { UpsCarrier } from "../../src/carriers/ups/UpsCarrier";
import { AppError } from "../../src/domain/errors";
import type { RateRequest } from "../../src/domain/models";

describe("UPS timeout handling", () => {
  it("maps delayed response to TIMEOUT", async () => {
    const baseUrl = "https://wwwcie.ups.com";
    const version = "v2409";

    const http = new AxiosHttpClient();
    const cache = new TokenCache();

    nock(baseUrl).post("/security/v1/oauth/token").reply(200, { access_token: "T", expires_in: 3600 });

    // Delay longer than timeoutMs below
    nock(baseUrl)
      .post(`/rating/${version}/Shop`)
      .delayConnection(200) // ms
      .reply(200, { RateResponse: { Response: {}, RatedShipment: [] } });

    const auth = new OAuthClient(http, `${baseUrl}/security/v1/oauth/token`, "id", "secret", cache);
    const carrier = new UpsCarrier(http, auth, { baseUrl, version, timeoutMs: 50 });

    const req = {
      shipper: { countryCode: "US", postalCode: "10001" },
      recipient: { countryCode: "US", postalCode: "94105" },
      packages: [{ weight: { value: 1, unit: "LB" } }],
    } satisfies RateRequest;

    await expect(carrier.getRates(req)).rejects.toMatchObject({
    code: "TIMEOUT",
    retryable: true,
    });

  });
});
