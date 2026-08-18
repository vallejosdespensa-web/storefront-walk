export interface Brand {
  id: string;
  name: string;
  logoUrl: string;
}

export interface ProductVariant {
  label: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  /** placeholder visual */
  color: string;
  variants: ProductVariant[];
  inStock: boolean;
}

export interface CategoryNode {
  id: string;
  name: string;
  children?: CategoryNode[];
  /** solo en nodos hoja */
  brandIds?: string[];
  /** 3-4 productos para la miniatura */
  thumbnailProductIds?: string[];
}

export interface Tenant {
  name: string;
  logoUrl: string;
  facadeImageUrl: string;
  rating: number;
  isOpen: boolean;
  paymentMethods: string[];
  offerProductIds: string[];
  categories: CategoryNode[];
  stackedCategories: CategoryNode[];
  brands: Brand[];
  products: Product[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantLabel: string;
  price: number;
}
