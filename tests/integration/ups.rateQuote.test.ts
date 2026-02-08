import "./_setup";
import { describe, it, expect } from "vitest";
import nock from "nock";

import { AxiosHttpClient } from "../../src/http/AxiosHttpClient";
import { TokenCache } from "../../src/auth/TokenCache";
import { OAuthClient } from "../../src/auth/OAuthClient";
import { UpsCarrier } from "../../src/carriers/ups/UpsCarrier";

describe("UPS Rating - getRates (integration w/ stubbed HTTP)", () => {
  it("builds correct UPS request payload and normalizes successful response (Shop)", async () => {
    const baseUrl = "https://wwwcie.ups.com";
    const version = "v2409";

    const http = new AxiosHttpClient();
    const cache = new TokenCache();

    // OAuth token stub
    nock(baseUrl)
      .post("/security/v1/oauth/token", "grant_type=client_credentials")
      .matchHeader("authorization", (v) => typeof v === "string" && v.startsWith("Basic "))
      .matchHeader("content-type", (v) => String(v).includes("application/x-www-form-urlencoded"))
      .reply(200, { access_token: "TOKEN_1", expires_in: 3600 });

    // Rating stub with request body assertion
    nock(baseUrl)
      .post(`/rating/${version}/Shop`, (body) => {
        // Assert body is built from domain model
        expect(body).toHaveProperty("RateRequest");
        expect(body.RateRequest).toHaveProperty("Shipment");

        const shipment = body.RateRequest.Shipment;

        expect(shipment.Shipper.Address.CountryCode).toBe("US");
        expect(shipment.Shipper.Address.PostalCode).toBe("10001");

        expect(shipment.ShipTo.Address.CountryCode).toBe("US");
        expect(shipment.ShipTo.Address.PostalCode).toBe("94105");

        expect(Array.isArray(shipment.Package)).toBe(true);
        expect(shipment.Package.length).toBe(1);

        expect(shipment.Package[0].PackageWeight.Weight).toBe("2");
        expect(shipment.Package[0].PackageWeight.UnitOfMeasurement.Code).toBe("LB");

        // dimensions optional – we provided them below, so they must exist
        expect(shipment.Package[0].Dimensions.Length).toBe("10");
        expect(shipment.Package[0].Dimensions.Width).toBe("6");
        expect(shipment.Package[0].Dimensions.Height).toBe("4");
        expect(shipment.Package[0].Dimensions.UnitOfMeasurement.Code).toBe("IN");

        // In Shop mode with no serviceLevel, Service must not be forced
        expect(shipment.Service).toBeUndefined();

        return true;
      })
      .matchHeader("authorization", "Bearer TOKEN_1")
      .matchHeader("content-type", (v) => String(v).includes("application/json"))
      .reply(200, {
        RateResponse: {
          Response: {},
          RatedShipment: [
            {
              Service: { Code: "03", Description: "UPS Ground" },
              TotalCharges: { MonetaryValue: "12.34", CurrencyCode: "USD" },
              GuaranteedDelivery: { BusinessDaysInTransit: "3" },
            },
            {
              Service: { Code: "02", Description: "2nd Day Air" },
              TotalCharges: { MonetaryValue: "45.67", CurrencyCode: "USD" },
            },
          ],
        },
      });

    const auth = new OAuthClient(
      http,
      `${baseUrl}/security/v1/oauth/token`,
      "client_id",
      "client_secret",
      cache,
    );

    const carrier = new UpsCarrier(http, auth, {
      baseUrl,
      version,
      timeoutMs: 15000,
      transactionSrc: "testing",
    });

    const result = await carrier.getRates({
      shipper: { countryCode: "US", postalCode: "10001" },
      recipient: { countryCode: "US", postalCode: "94105" },
      packages: [
        {
          weight: { value: 2, unit: "LB" },
          dimensions: { length: 10, width: 6, height: 4, unit: "IN" },
        },
      ],
    });

    expect(result.quotes.length).toBe(2);
    expect(result.quotes[0]).toMatchObject({
      carrier: "UPS",
      serviceLevel: "03",
      serviceName: "UPS Ground",
      total: { amount: "12.34", currency: "USD" },
      deliveryDays: 3,
    });
  });

  it("filters quotes if serviceLevel provided (Rate option) and includes Service.Code in payload", async () => {
    const baseUrl = "https://wwwcie.ups.com";
    const version = "v2409";

    const http = new AxiosHttpClient();
    const cache = new TokenCache();

    nock(baseUrl)
      .post("/security/v1/oauth/token")
      .reply(200, { access_token: "TOKEN_2", expires_in: 3600 });

    nock(baseUrl)
      .post(`/rating/${version}/Rate`, (body) => {
        const shipment = body.RateRequest.Shipment;
        expect(shipment.Service).toEqual({ Code: "03" }); // serviceLevel forced
        return true;
      })
      .reply(200, {
        RateResponse: {
          Response: {},
          RatedShipment: [
            {
              Service: { Code: "03", Description: "UPS Ground" },
              TotalCharges: { MonetaryValue: "9.99", CurrencyCode: "USD" },
            },
          ],
        },
      });

    const auth = new OAuthClient(http, `${baseUrl}/security/v1/oauth/token`, "id", "secret", cache);
    const carrier = new UpsCarrier(http, auth, { baseUrl, version, timeoutMs: 15000 });

    const result = await carrier.getRates({
      shipper: { countryCode: "US", postalCode: "10001" },
      recipient: { countryCode: "US", postalCode: "94105" },
      packages: [{ weight: { value: 1, unit: "LB" } }],
      serviceLevel: "03",
    });

    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0].serviceLevel).toBe("03");
  });
});
