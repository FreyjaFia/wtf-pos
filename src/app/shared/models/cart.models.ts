export interface CartItemDto {
  productId: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string | null;
}
