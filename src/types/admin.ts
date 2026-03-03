export type OrderType = "ghost" | "storefront" | "wholesale";

export interface UnifiedOrder {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  date: string;
  customerName: string | null;
  customerEmail: string;
  customerBusiness: string | null;
  status: string;
  paymentStatus: string;
  total: number;
  roasterName: string | null;
  roasterId: string | null;
  artworkStatus: string | null;
  source: string | null;
  itemSummary: string;
}

export interface OrderFilters {
  search?: string;
  status?: string;
  paymentStatus?: string;
  orderType?: OrderType;
  dateFrom?: string;
  dateTo?: string;
  roasterId?: string;
  artworkStatus?: string;
}

export interface OrderSort {
  key: string;
  direction: "asc" | "desc";
}

export interface OrdersListResponse {
  data: UnifiedOrder[];
  total: number;
  page: number;
  pageSize: number;
}
