import { env } from "./config/env";
import { AxiosHttpClient } from "./http/AxiosHttpClient";
import { TokenCache } from "./auth/TokenCache";
import { OAuthClient } from "./auth/OAuthClient";
import { UpsCarrier } from "./carriers/ups/UpsCarrier";
import { AppError } from "./domain/errors";
import type { RateRequest } from "./domain/models";
import { MockHttpClient } from "./http/MockHttpClient";


function createUpsCarrierFromEnv() {
  const http = new AxiosHttpClient();
  const cache = new TokenCache();

  const tokenUrl =
    `${env.UPS_BASE_URL.replace(/\/$/, "")}${env.UPS_OAUTH_TOKEN_PATH}`;

  const auth = new OAuthClient(
    http,
    tokenUrl,
    env.UPS_CLIENT_ID,
    env.UPS_CLIENT_SECRET,
    cache
  );

  return new UpsCarrier(http, auth, {
    baseUrl: env.UPS_BASE_URL,
    version: env.UPS_RATE_VERSION,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    transactionSrc: "cli",
  });
}

type CliArgs = {
  mock: boolean;
  fromZip?: string;
  toZip?: string;
  weight?: string;
  unit?: string;
  service?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { mock: false };

  for (const a of argv) {
    if (a === "--mock") {
      out.mock = true;
      continue;
    }

    const m = a.match(/^--([^=]+)=(.*)$/);
    if (!m) continue;

    const key = m[1];
    const value = m[2];

    if (key === "fromZip") out.fromZip = value;
    else if (key === "toZip") out.toZip = value;
    else if (key === "weight") out.weight = value;
    else if (key === "unit") out.unit = value;
    else if (key === "service") out.service = value;
  }

  return out;
}

function createUpsCarrierMock() {
  const baseUrl = "https://mock.ups.local";
  const version = "v2409";

  const http = new MockHttpClient([
    {
      match: (r) => r.method === "POST" && r.url.endsWith("/security/v1/oauth/token"),
      handle: () => ({
        status: 200,
        data: { access_token: "MOCK_TOKEN", expires_in: 3600 },
      }),
    },
    {
      match: (r) => r.method === "POST" && r.url.includes(`/rating/${version}/Shop`),
      handle: () => ({
        status: 200,
        data: {
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
        },
      }),
    },
    {
      match: (r) => r.method === "POST" && r.url.includes(`/rating/${version}/Rate`),
      handle: () => ({
        status: 200,
        data: {
          RateResponse: {
            Response: {},
            RatedShipment: [
              {
                Service: { Code: "03", Description: "UPS Ground" },
                TotalCharges: { MonetaryValue: "9.99", CurrencyCode: "USD" },
              },
            ],
          },
        },
      }),
    },
  ]);

  const cache = new TokenCache();
  const auth = new OAuthClient(http, `${baseUrl}/security/v1/oauth/token`, "id", "secret", cache);

  return new UpsCarrier(http, auth, {
    baseUrl,
    version,
    timeoutMs: 15000,
    transactionSrc: "cli-mock",
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const fromZip = args.fromZip ?? "10001";
  const toZip = args.toZip ?? "94105";
  const weight = args.weight ? Number(args.weight) : 2;
  const unit = (args.unit ?? "LB") as "LB" | "KG";

  const carrier = args.mock ? createUpsCarrierMock() : createUpsCarrierFromEnv();


  const req = {
    shipper: { countryCode: "US", postalCode: fromZip },
    recipient: { countryCode: "US", postalCode: toZip },
    packages: [
      {
        weight: { value: weight, unit },
        dimensions: { length: 10, width: 6, height: 4, unit: "IN" },
      },
    ],
    ...(args.service ? { serviceLevel: args.service } : {}),
  } satisfies RateRequest;

  const res = await carrier.getRates(req);

  console.log("\nUPS Rate Quotes:\n");
  if (res.quotes.length === 0) {
    console.log("No quotes returned.");
    return;
  }

  for (const q of res.quotes) {
    const days = q.deliveryDays ? ` | ${q.deliveryDays} business days` : "";
    const name = q.serviceName ? ` (${q.serviceName})` : "";
    console.log(`- ${q.serviceLevel}${name}: ${q.total.amount} ${q.total.currency}${days}`);
  }
  console.log("");
}

main().catch((e) => {
  if (e instanceof AppError) {
    console.error("\nRequest failed (structured error)");
    console.error(`code: ${e.code}`);
    if (e.status) console.error(`status: ${e.status}`);
    console.error(`message: ${e.message}`);
    if (e.details) console.error(`details: ${JSON.stringify(e.details, null, 2)}`);
    process.exit(1);
  }

  console.error("\nUnexpected error:", e);
  process.exit(1);
});
