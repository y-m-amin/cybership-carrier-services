export type Currency = string;

export type Money = {
  amount: string;     // keep as string to avoid float issues
  currency: Currency;
};

export type Address = {
  countryCode: string;    // e.g. "US"
  postalCode: string;
  stateProvince?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
};

export type Package = {
  weight: { value: number; unit: "LB" | "KG" };
  dimensions?: { length: number; width: number; height: number; unit: "IN" | "CM" };
};

export type RateRequest = {
  shipper: Address;
  recipient: Address;
  packages: Package[];
  serviceLevel?: string; // optional filter (carrier-specific code)
};

export type RateQuote = {
  carrier: string;        // "UPS"
  serviceLevel: string;   // normalized code
  serviceName?: string;
  total: Money;
  deliveryDays?: number;
  warnings?: string[];
};

export type RateResponse = {
  quotes: RateQuote[];
};
