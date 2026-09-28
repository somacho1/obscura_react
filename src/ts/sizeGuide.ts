// 관리자 상품등록 SIZE GUIDE 유형
export type SizeGuideType = 'NONE' | 'CLOTHING_TOP' | 'CLOTHING_BOTTOM' | 'CLOTHING_ONEPIECE' | 'SHOES' | 'ACCESSORY';

// SIZE GUIDE 유형 셀렉트용
export interface SizeGuideTypeOption {
    value: SizeGuideType;
    label: string;
}

// 사이즈표 한 행
// 예: { label: 'LENGTH', values: ['68', '70', '72'] }
export interface SizeGuideRow {
    label: string;
    values: string[];
}

// PRODUCT.SIZEDETAIL에 JSON으로 저장할 최종 구조
export interface SizeGuide {
    type: SizeGuideType;
    unit: string;
    columns: string[];
    rows: SizeGuideRow[];
    notice: string;
    model: string;
    wearingSize: string;
}

// 관리자 유형 셀렉트
export const SIZE_GUIDE_TYPE_OPTIONS: SizeGuideTypeOption[] = [
    { value: 'NONE', label: '사용 안 함' },
    { value: 'CLOTHING_TOP', label: '의류 - 상의' },
    { value: 'CLOTHING_BOTTOM', label: '의류 - 하의' },
    { value: 'CLOTHING_ONEPIECE', label: '의류 - 원피스 / 올인원' },
    { value: 'SHOES', label: '신발' },
    { value: 'ACCESSORY', label: '악세사리 / 기타' },
];

// 의류 사이즈 선택 시 기본으로 제공할 사이즈
export const CLOTHING_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE SIZE'];

// 상의 기본 실측 항목
export const TOP_MEASUREMENT_OPTIONS = ['LENGTH', 'SHOULDER', 'CHEST', 'SLEEVE', 'ARMHOLE', 'HEM'];

// 하의 기본 실측 항목
export const BOTTOM_MEASUREMENT_OPTIONS = ['LENGTH', 'WAIST', 'RISE', 'HIP', 'THIGH', 'HEM'];

// 원피스 / 올인원 기본 실측 항목
export const ONEPIECE_MEASUREMENT_OPTIONS = ['LENGTH', 'SHOULDER', 'CHEST', 'WAIST', 'SLEEVE', 'HIP', 'HEM'];

// 악세사리 / 기타에서 필요할 때 사용할 기본 항목
export const ACCESSORY_MEASUREMENT_OPTIONS = ['WIDTH', 'HEIGHT', 'LENGTH', 'DEPTH', 'CIRCUMFERENCE', 'DIAMETER'];

// 신발 사이즈 변환표 기본 컬럼
export const SHOES_DEFAULT_COLUMNS = ['KR', 'EU', 'UK', 'US', 'CM'];

// 유형별 기본 실측 항목 반환
export function getMeasurementOptions(type: SizeGuideType): string[] {
    if (type === 'CLOTHING_TOP') return TOP_MEASUREMENT_OPTIONS;
    if (type === 'CLOTHING_BOTTOM') return BOTTOM_MEASUREMENT_OPTIONS;
    if (type === 'CLOTHING_ONEPIECE') return ONEPIECE_MEASUREMENT_OPTIONS;
    if (type === 'ACCESSORY') return ACCESSORY_MEASUREMENT_OPTIONS;
    return [];
}

// 유형을 선택했을 때 사용할 빈 SIZE GUIDE 생성
export function createEmptySizeGuide(type: SizeGuideType): SizeGuide {
    if (type === 'SHOES') {
        return {
            type,
            unit: 'cm',
            columns: [...SHOES_DEFAULT_COLUMNS.slice(1)],
            rows: [],
            notice: '해당 표는 사이즈 가이드이며 상품에 따라 실제 사이즈가 달라질 수 있습니다.',
            model: '',
            wearingSize: '',
        };
    }

    return {
        type,
        unit: 'cm',
        columns: [],
        rows: [],
        notice: '',
        model: '',
        wearingSize: '',
    };
}