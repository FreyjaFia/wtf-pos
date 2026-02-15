export enum ProductCategoryEnum {
  Drink = 1,
  Food = 2,
  Dessert = 3,
  Other = 4,
}

export interface ProductPriceHistoryDto {
  id: string;
  productId: string;
  oldPrice?: number | null;
  newPrice: number;
  updatedAt: string;
  updatedBy: string;
  updatedByName?: string | null;
}

export interface ProductDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  category: ProductCategoryEnum;
  isAddOn: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  imageUrl?: string | null;
  priceHistory: ProductPriceHistoryDto[];
}

export interface ProductListDto {
  products: ProductDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateProductDto {
  name: string;
  code: string;
  description?: string | null;
  price: number;
  category: ProductCategoryEnum;
  isAddOn: boolean;
  isActive: boolean;
}

export interface UpdateProductDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  category: ProductCategoryEnum;
  isAddOn: boolean;
  isActive: boolean;
}

export interface ProductSimpleDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  category: ProductCategoryEnum;
  isActive: boolean;
  imageUrl?: string | null;
}
