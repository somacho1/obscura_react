// 로그인 세션 쿠키와 변경 요청 확인 헤더를 모든 API에서 공통으로 전달합니다.
// 화면의 localStorage 값은 서버 권한 검사에 사용하지 않습니다.
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-Requested-With', 'OBSCURA');
  }
  return fetch(input, { ...init, headers, credentials: 'include' }).then(response => {
    // 권한 회수나 세션 만료를 화면에도 반영합니다. /me는 반복 조회하지 않습니다.
    const url = input instanceof Request ? input.url : String(input);
    if ((response.status === 401 || response.status === 403) && !url.endsWith('/members/me')) {
      window.dispatchEvent(new Event('obscura-auth-refresh'));
    }
    return response;
  });
}
