import "./_setup";
import { describe, it, expect } from "vitest";
import nock from "nock";
import { AxiosHttpClient } from "../../src/http/AxiosHttpClient";
import { TokenCache } from "../../src/auth/TokenCache";
import { OAuthClient } from "../../src/auth/OAuthClient";
import { UpsCarrier } from "../../src/carriers/ups/UpsCarrier";
import { AppError } from "../../src/domain/errors";

describe("Input validation", () => {
  it("rejects invalid request before calling UPS", async () => {
    const baseUrl = "https://wwwcie.ups.com";
    const http = new AxiosHttpClient();
    const auth = new OAuthClient(http, `${baseUrl}/security/v1/oauth/token`, "id", "secret", new TokenCache());
    const carrier = new UpsCarrier(http, auth, { baseUrl, version: "v2409", timeoutMs: 15000 });

    // No nock mocks on purpose: any outgoing call will fail due to disableNetConnect()

    await expect(
      carrier.getRates({
        shipper: { countryCode: "USA", postalCode: "10001" }, // invalid length
        recipient: { countryCode: "US", postalCode: "94105" },
        packages: [], // invalid
      } as any),
   ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

  });
});
