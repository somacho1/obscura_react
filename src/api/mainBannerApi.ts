import { apiFetch } from './apiFetch';
import type { MainBannerRequest, MainBannerResponse } from '../ts/mainBanner';

const MAIN_BANNER_API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/main-banners`;

// 서버의 오류 문구를 읽고, 정상 응답은 배너 데이터로 변환합니다.
async function readResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const text = await response.text();
        let message = text || `요청에 실패했습니다. (${response.status})`;

        // Spring Boot의 JSON 오류 응답도 처리합니다.
        try {
            const error = JSON.parse(text) as { message?: string; detail?: string };
            message = error.detail || error.message || message;
        } catch {
            // 일반 문자열 오류는 그대로 사용합니다.
        }

        throw new Error(message);
    }

    return response.json() as Promise<T>;
}

// 관리자 전체 목록
export async function getMainBanners(signal?: AbortSignal): Promise<MainBannerResponse[]> {
    const response = await apiFetch(MAIN_BANNER_API_URL, { signal });
    return readResponse<MainBannerResponse[]>(response);
}

// Hero에 표시할 노출 중인 배너
export async function getActiveMainBanners(signal?: AbortSignal): Promise<MainBannerResponse[]> {
    const response = await apiFetch(`${MAIN_BANNER_API_URL}/active`, { signal });
    return readResponse<MainBannerResponse[]>(response);
}

// 신규 등록: 백엔드에서 숨김 상태로 생성합니다.
export async function createMainBanner(data: MainBannerRequest): Promise<MainBannerResponse> {
    const response = await apiFetch(MAIN_BANNER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return readResponse<MainBannerResponse>(response);
}

// 배너명·대체 텍스트·노출 여부·순서 수정
export async function updateMainBanner(
    no: number,
    data: MainBannerRequest,
): Promise<MainBannerResponse> {
    const response = await apiFetch(`${MAIN_BANNER_API_URL}/${no}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return readResponse<MainBannerResponse>(response);
}

// 이미지 등록·교체
export async function uploadMainBannerImage(
    no: number,
    file: File,
): Promise<MainBannerResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch(`${MAIN_BANNER_API_URL}/${no}/image`, {
        method: 'POST',
        body: formData,
    });
    return readResponse<MainBannerResponse>(response);
}

// 이미지 연결 제거: 서버에서 배너도 자동으로 숨깁니다.
export async function removeMainBannerImage(no: number): Promise<MainBannerResponse> {
    const response = await apiFetch(`${MAIN_BANNER_API_URL}/${no}/image`, {
        method: 'DELETE',
    });
    return readResponse<MainBannerResponse>(response);
}

// 배너 삭제: 204 응답이므로 JSON을 읽지 않습니다.
export async function deleteMainBanner(no: number): Promise<void> {
    const response = await apiFetch(`${MAIN_BANNER_API_URL}/${no}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        await readResponse<never>(response);
    }
}
