import type { RateRequest, RateResponse } from "../../domain/models";
import type { UpsRateResponse } from "./upsSchemas";

export function buildUpsRateRequestBody(req: RateRequest) {
  return {
    RateRequest: {
      Request: {}, // doc shows empty is allowed in simple example
      Shipment: {
        Shipper: { Address: mapAddress(req.shipper) },
        ShipTo: { Address: mapAddress(req.recipient) },
        Package: req.packages.map(mapPackage),
        ...(req.serviceLevel ? { Service: { Code: req.serviceLevel } } : {}),
      },
    },
  };
}

function mapAddress(a: RateRequest["shipper"]) {
  return {
    CountryCode: a.countryCode,
    PostalCode: a.postalCode,
    ...(a.stateProvince ? { StateProvinceCode: a.stateProvince } : {}),
    ...(a.city ? { City: a.city } : {}),
    ...(a.addressLine1
      ? { AddressLine: [a.addressLine1, a.addressLine2].filter(Boolean) }
      : {}),
  };
}

function mapPackage(p: RateRequest["packages"][number]) {
  const pkg: any = {
    PackageWeight: {
      UnitOfMeasurement: { Code: p.weight.unit },
      Weight: String(p.weight.value),
    },
  };

  if (p.dimensions) {
    pkg.Dimensions = {
      UnitOfMeasurement: { Code: p.dimensions.unit },
      Length: String(p.dimensions.length),
      Width: String(p.dimensions.width),
      Height: String(p.dimensions.height),
    };
  }

  return pkg;
}

export function normalizeUpsRateResponse(ups: UpsRateResponse, serviceFilter?: string): RateResponse {
  const quotes = ups.RateResponse.RatedShipment
    .map((s) => ({
      carrier: "UPS",
      serviceLevel: s.Service.Code,
      serviceName: s.Service.Description,
      total: {
        amount: s.TotalCharges.MonetaryValue,
        currency: s.TotalCharges.CurrencyCode,
      },
      deliveryDays: s.GuaranteedDelivery?.BusinessDaysInTransit
        ? Number(s.GuaranteedDelivery.BusinessDaysInTransit)
        : undefined,
    }))
    .filter((q) => (serviceFilter ? q.serviceLevel === serviceFilter : true));

  return { quotes };
}
