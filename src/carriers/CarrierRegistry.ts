import type { Carrier } from "./Carrier";
import { AppError } from "../domain/errors";

export class CarrierRegistry {
  private carriers = new Map<string, Carrier>();

  register(name: string, carrier: Carrier) {
    this.carriers.set(name, carrier);
  }

  get(name: string): Carrier {
    const carrier = this.carriers.get(name);
    if (!carrier) {
      throw new AppError({
        code: "UNSUPPORTED_CARRIER",
        message: `Carrier not registered: ${name}`,
        details: { name },
      });
    }
    return carrier;
  }

  list(): string[] {
    return Array.from(this.carriers.keys());
  }
}
