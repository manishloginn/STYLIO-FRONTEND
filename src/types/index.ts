export type Role = 'CUSTOMER' | 'SALON_OWNER' | 'SALON_STAFF' | 'PLATFORM_ADMIN';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
}

export interface Page<T> {
  items?: T[];
  data?: T[];
}

export interface Salon {
  id: string;
  name: string;
  description: string;
  salonType: string;
  city: string;
  phone: string;
  coverImage?: string;
  gallery?: string[];
  status: string;
  planCount?: number;
  minPrice?: number;
  rating?: { average: number; count: number } | null;
  branches?: Branch[];
  services?: SalonService[];
  plans?: MembershipPlan[];
}

export interface Branch {
  id: string;
  salonId: string;
  name: string;
  address: string;
  city: string;
  status: string;
}

export interface SalonService {
  id: string;
  salonId: string;
  name: string;
  category: string;
  description?: string;
  retailPrice: number;
  active: boolean;
}

export interface PlanItem {
  id?: string;
  serviceId: string;
  quantityLimit?: number | null;
  valueDeduction?: number | null;
  excluded?: boolean;
  service?: SalonService | null;
}

export interface MembershipPlan {
  id: string;
  salonId: string;
  name: string;
  description: string;
  planType: 'VALUE' | 'SERVICE' | 'BOTH' | 'DISCOUNT';
  planSource: 'EXISTING' | 'STYLIO_CREATED';
  externalPlanId?: string;
  sellingPrice: number;
  validityDays: number;
  serviceValueLimit?: number | null;
  discountPercentage?: number | null;
  discountCap?: number | null;
  stackingAllowed: boolean;
  terms: string;
  restrictions: string;
  status: string;
  items: PlanItem[];
  branchIds: string[];
}

export interface Entitlement {
  id: string;
  serviceId?: string | null;
  entitlementType: 'VALUE' | 'QUANTITY';
  totalValue: number;
  consumedValue: number;
  totalQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number | null;
  remainingValue: number | null;
  service?: SalonService | null;
}

export interface Membership {
  id: string;
  salonId: string;
  planId: string;
  purchasePrice: number;
  planTypeSnapshot: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  source: string;
  planSnapshot: MembershipPlan & { items: PlanItem[]; branchIds: string[] };
  salon?: { id: string; name: string; city: string; coverImage?: string } | null;
  customer?: { id: string; name: string; phone: string } | null;
  entitlements: Entitlement[];
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  gateway: string;
  gatewayOrderId?: string;
  membershipId?: string;
  planId: string;
  keyId?: string;
  callbackUrl?: string;
}

export interface Redemption {
  id: string;
  serviceId: string;
  serviceName?: string;
  planName?: string | null;
  customer?: { id: string; name: string; phone: string } | null;
  status: string;
  redeemedAt: string;
  discountAmount: number;
  customerPayable: number;
  entitlementDeduction: number;
  retailPriceSnapshot: number;
}
