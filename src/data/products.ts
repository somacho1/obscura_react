import type { Product } from '../types/product';

// 기존 Obscura TODAY NEW 상품 이미지
import beltImage from '../assets/images/obscura/new belt.jpg';
import teeImage from '../assets/images/obscura/new tee.jpg';
import bearImage from '../assets/images/obscura/new bear.jpg';
import thorImage from '../assets/images/obscura/new thor.jpg';
import hatImage from '../assets/images/obscura/new hat.jpg';
import pantsImage from '../assets/images/obscura/new pants.jpg';
import newImage07 from '../assets/images/obscura/new7.jpg';
import newImage08 from '../assets/images/obscura/new8.jpg';
import newImage09 from '../assets/images/obscura/new9.jpg';

// 기존 Obscura BEST 상품 이미지
import best01 from '../assets/images/obscura/best1.png';
import best02 from '../assets/images/obscura/best2.png';
import best03 from '../assets/images/obscura/best3.jpg';
import best04 from '../assets/images/obscura/best4.png';
import best05 from '../assets/images/obscura/best5.jpg';
import best06 from '../assets/images/obscura/best6.jpg';
import best07 from '../assets/images/obscura/best7.jpg';


// 백엔드 연결 전 사용할 TODAY NEW 임시 상품 데이터
export const todayNewProducts: Product[] = [
  { id:1, brand:'BED J.W. FORD', name:'Huge Bit Buckle Belt(Brown)', price:498000, image:beltImage, category:'ACC' },
  { id:2, brand:'OPEN YY', name:'Ombre U-Neck Tee', price:69000, image:teeImage, category:'WOMEN' },
  { id:3, brand:'MONTBELL', name:'Strap Monta Bear (Black)', price:19000, image:bearImage, category:'ACC' },
  { id:4, brand:'JUTTA NEUMANN', name:'Thor (Black Latigo)', price:518000, image:thorImage, category:'SHOES' },
  { id:5, brand:'MONTBELL', name:'Camouflage Watch Hat (Camouflage)', price:39000, image:hatImage, category:'ACC' },
  { id:6, brand:'BED J.W. FORD', name:'Garment-Dye Parachute Pants (Black)', price:1116000, image:pantsImage, category:'MEN' },

  // 원본 HTML에서도 아직 상품명이 임시값이라 우선 그대로 유지
  { id:7, brand:'브랜드이름', name:'상품설명', price:0, image:newImage07, category:'MEN' },
  { id:8, brand:'브랜드이름', name:'상품설명', price:0, image:newImage08, category:'WOMEN' },
  { id:9, brand:'브랜드이름', name:'상품설명', price:0, image:newImage09, category:'ACC' },
];



// 백엔드 연결 전 사용할 BEST 상품 데이터
export const bestProducts: Product[] = [
  { id:101, brand:'YOUTH', name:'Hooded Knit Top (Lavender)', price:128000, originalPrice:183000, discountRate:30, comment:'20% OFF CODE : NEW20 (1/7-1/13)', image:best01, category:'WOMEN' },
  { id:102, brand:'YOUTH', name:'High Neck Damaged Knit Vest', price:82600, comment:'20% OFF CODE : NEW20 (1/7-1/13)', image:best02, category:'WOMEN' },
  { id:103, brand:'YOUTH', name:'Hooded Knit Top (Black)', price:128000, originalPrice:183000, discountRate:30, comment:'20% OFF CODE : NEW20 (1/7-1/13)', image:best03, category:'MEN' },
  { id:104, brand:'EGONLAB', name:'Egonlab Jumper (Green Wool)', price:904000, image:best04, category:'MEN' },

  // 원본에서도 아직 임시 데이터이므로 그대로 유지
  { id:105, brand:'브랜드이름', name:'상품설명', price:0, image:best05, category:'MEN' },
  { id:106, brand:'브랜드이름', name:'상품설명', price:0, image:best06, category:'WOMEN' },
  { id:107, brand:'브랜드이름', name:'상품설명', price:0, image:best07, category:'ACC' },
];