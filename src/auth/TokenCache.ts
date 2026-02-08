export type CachedToken = { accessToken: string; expiresAt: number };

export class TokenCache {
  private token?: CachedToken;

  getValid(now = Date.now(), skewMs = 30_000): string | null {
    if (!this.token) return null;
    if (now + skewMs >= this.token.expiresAt) return null;
    return this.token.accessToken;
  }

  set(accessToken: string, expiresInSeconds: number, now = Date.now()) {
    this.token = { accessToken, expiresAt: now + expiresInSeconds * 1000 };
  }

  clear() {
    this.token = undefined;
  }
}
