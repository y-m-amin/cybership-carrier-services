import { env } from "../../config/env";
import { AxiosHttpClient } from "../../http/AxiosHttpClient";
import { OAuthClient } from "../../auth/OAuthClient";
import { TokenCache } from "../../auth/TokenCache";
import { UpsCarrier } from "./UpsCarrier";

export function createUpsCarrier() {
  const http = new AxiosHttpClient();
  const cache = new TokenCache();

  const tokenUrl = `${env.UPS_BASE_URL.replace(/\/$/, "")}${env.UPS_OAUTH_TOKEN_PATH}`;
  const auth = new OAuthClient(http, tokenUrl, env.UPS_CLIENT_ID, env.UPS_CLIENT_SECRET, cache);

  return new UpsCarrier(http, auth, {
    baseUrl: env.UPS_BASE_URL,
    version: env.UPS_RATE_VERSION,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    transactionSrc: "testing",
  });
}
