// Obscura에서 사용하는 상품 데이터 구조
export interface Product {
  id: number;
  brand: string;
  name: string;
  price: number;
  image: string;
  category: 'MEN' | 'WOMEN' | 'SHOES' | 'ACC';

  // 일부 상품에만 존재하므로 선택값(?)으로 지정
  comment?: string;
  discountRate?: number;
  originalPrice?: number;
}