declare module "react-native-purchases" {
  export const LOG_LEVEL: { DEBUG: unknown };
  export const PACKAGE_TYPE: {
    ANNUAL: string;
    MONTHLY: string;
    CUSTOM: string;
    LIFETIME: string;
  };
  export const INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: string;
  };
  export type CustomerInfo = {
    entitlements: { active: Record<string, unknown> };
    managementURL: string | null;
  };
  export type PurchasesPackage = {
    identifier: string;
    packageType: string;
    product: {
      identifier: string;
      price: number;
      priceString: string;
      currencyCode: string;
      introPrice?: unknown;
    };
  };
  const Purchases: any;
  export default Purchases;
}
