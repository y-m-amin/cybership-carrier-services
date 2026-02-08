import type { RateRequest, RateResponse } from "../domain/models";

export interface Carrier {
  getRates(req: RateRequest): Promise<RateResponse>;
}
