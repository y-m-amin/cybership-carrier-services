import "./_setup";
import { describe, it, expect } from "vitest";
import { CarrierRegistry } from "../../src/carriers/CarrierRegistry";
import { ShippingService } from "../../src/ShippingService";

describe("ShippingService + CarrierRegistry", () => {
  it("throws UNSUPPORTED_CARRIER when carrier not registered", async () => {
    const registry = new CarrierRegistry();
    const shipping = new ShippingService(registry);

    await expect(
      shipping.getRates({
        carrier: "ups" as any,
        request: {
          shipper: { countryCode: "US", postalCode: "10001" },
          recipient: { countryCode: "US", postalCode: "94105" },
          packages: [{ weight: { value: 1, unit: "LB" } }],
        },
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CARRIER" });
  });
});
