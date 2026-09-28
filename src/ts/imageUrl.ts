const BACKEND_URL = 'http://localhost:9101';

export function getImageUrl(imageUrl: string | null | undefined) {
    if (!imageUrl) return '';

    // 이미 완전한 URL이면 그대로 사용
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        return imageUrl;
    }

    // Spring Boot가 제공하는 업로드 이미지에만 백엔드 주소 추가
    if (imageUrl.startsWith('/uploads/')) {
        return `${BACKEND_URL}${imageUrl}`;
    }

    // 기존 React public/assets 이미지 등은 그대로 사용
    return imageUrl;
}