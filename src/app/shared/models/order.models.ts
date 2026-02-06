export enum OrderStatusEnum {
  All = -1,
  Pending = 0,
  Done = 1,
  Cancelled = 2,
  ForDelivery = 3
}

export interface OrderItemDto {
  id: string;
  productId: string;
  quantity: number;
}

export interface OrderDto {
  id: string;
  orderNumber: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  items: OrderItemDto[];
  customerId?: string | null;
  status: OrderStatusEnum;
}

export interface OrderListDto {
  items: OrderDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateOrderCommand {
  customerId?: string | null;
  items: OrderItemDto[];
  status: OrderStatusEnum;
}

export interface UpdateOrderCommand {
  id: string;
  customerId?: string | null;
  items: OrderItemDto[];
  status: OrderStatusEnum;
}
