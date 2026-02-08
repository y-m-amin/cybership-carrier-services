import axios, { AxiosError } from "axios";
import type { HttpClient, HttpRequest, HttpResponse } from "./HttpClient";
import { AppError } from "../domain/errors";

export class AxiosHttpClient implements HttpClient {
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    try {
      const res = await axios.request<T>({
        method: req.method,
        url: req.url,
        headers: req.headers,
        data: req.data,
        timeout: req.timeoutMs,
        validateStatus: () => true, // we handle status ourselves
      });

      return { status: res.status, data: res.data, headers: res.headers as any };
    } catch (e) {
      const err = e as AxiosError;

      // timeouts
      if (err.code === "ECONNABORTED") {
        throw new AppError({ code: "TIMEOUT", message: "HTTP request timed out", retryable: true, cause: err });
      }

      throw new AppError({ code: "NETWORK_ERROR", message: "HTTP network error", retryable: true, cause: err });
    }
  }
}
