export enum ProductTypeEnum {
  Drink = 0,
  Food = 1,
  Dessert = 2,
  Other = 3,
}

export interface ProductDto {
  id: string;
  name: string;
  price: number;
  type: ProductTypeEnum;
  isAddOn: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  imageUrl?: string | null;
}

export interface ProductListDto {
  products: ProductDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
