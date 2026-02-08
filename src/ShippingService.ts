import type { RateRequest, RateResponse } from "./domain/models";
import type { CarrierName } from "./carriers/carrierNames";
import { CarrierRegistry } from "./carriers/CarrierRegistry";

export class ShippingService {
  constructor(private registry: CarrierRegistry) {}

  async getRates(input: { carrier: CarrierName; request: RateRequest }): Promise<RateResponse> {
    const carrier = this.registry.get(input.carrier);
    return carrier.getRates(input.request);
  }
}
