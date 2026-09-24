const DEFAULT_TIMEOUT_MS = 90_000;
const NETWORK_RETRY_DELAYS_MS = [1_000, 2_000];

const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));

// Converts gateway errors (often HTML from a sleeping deployment) into a useful UI error.
export async function requestJson(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  for (let attempt = 0; attempt <= NETWORK_RETRY_DELAYS_MS.length; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : { error: (await response.text()).slice(0, 200) };

      if (!response.ok) {
        throw new Error(payload.error || `伺服器回傳 ${response.status}`);
      }
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('請求逾時，請確認後端服務已啟動後再試一次');
      }
      // A browser TypeError means no HTTP response was received, commonly while Render wakes.
      if (error instanceof TypeError && attempt < NETWORK_RETRY_DELAYS_MS.length) {
        await sleep(NETWORK_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw new Error('無法連線至後端服務');
}
