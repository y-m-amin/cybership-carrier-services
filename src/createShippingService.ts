import { env } from "./config/env";
import { ShippingService } from "./ShippingService";
import { CarrierRegistry } from "./carriers/CarrierRegistry";

import { AxiosHttpClient } from "./http/AxiosHttpClient";
import { TokenCache } from "./auth/TokenCache";
import { OAuthClient } from "./auth/OAuthClient";
import { UpsCarrier } from "./carriers/ups/UpsCarrier";

export function createShippingService() {
  const registry = new CarrierRegistry();

  // Shared dependencies
  const http = new AxiosHttpClient();

  // UPS wiring
  const cache = new TokenCache();
  const tokenUrl = `${env.UPS_BASE_URL.replace(/\/$/, "")}${env.UPS_OAUTH_TOKEN_PATH}`;

  const upsAuth = new OAuthClient(http, tokenUrl, env.UPS_CLIENT_ID, env.UPS_CLIENT_SECRET, cache);

  const ups = new UpsCarrier(http, upsAuth, {
    baseUrl: env.UPS_BASE_URL,
    version: env.UPS_RATE_VERSION,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    transactionSrc: "service",
  });

  registry.register("ups", ups);

  return new ShippingService(registry);
}
