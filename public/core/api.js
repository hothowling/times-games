/*
 * api.js - 서버 호출. 실패하면 Error(code) 를 던집니다. code 는 서버의 error 값 또는 'network'.
 * 주소는 상대 경로라 /games/ 아래에 배포해도 그대로 동작합니다.
 */
export async function api(method, path, body, headers = {}) {
  const raw = body instanceof Blob;
  let res;
  try {
    res = await fetch('api/' + path, {
      method,
      credentials: 'same-origin',
      headers: { ...(body && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
  } catch {
    throw Object.assign(new Error('network'), { code: 'network' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'server'), { code: data.error || 'server', status: res.status });
  return data;
}
