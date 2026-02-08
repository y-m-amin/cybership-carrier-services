export type UpsRequestOption = "Rate" | "Shop" | "Ratetimeintransit" | "Shoptimeintransit";

export function buildUpsRateUrl(args: {
  baseUrl: string;
  version: string; // e.g. v2409
  requestOption: UpsRequestOption;
}) {
  const { baseUrl, version, requestOption } = args;
  return `${baseUrl.replace(/\/$/, "")}/rating/${version}/${requestOption}`;
}
