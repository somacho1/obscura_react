import { apiFetch } from './apiFetch';
import type { MemberResponse } from '../ts/member';

// 기존 회원 API와 같은 서버 주소를 사용합니다.
const URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:9101'}/api/admin/members`;

async function read<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = await response.text();
    try {
      const body = JSON.parse(message) as { detail?: string; message?: string };
      message = body.detail || body.message || message;
    } catch { /* 문자열 오류는 그대로 사용합니다. */ }
    throw new Error(message || '회원 관리 요청에 실패했습니다.');
  }
  return response.json() as Promise<T>;
}

export async function getAdminMembers(): Promise<MemberResponse[]> {
  return read<MemberResponse[]>(await apiFetch(URL));
}

export async function changeMemberRole(no: number, role: 'USER' | 'ADMIN'): Promise<MemberResponse> {
  return read<MemberResponse>(await apiFetch(`${URL}/${no}/role`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }),
  }));
}
