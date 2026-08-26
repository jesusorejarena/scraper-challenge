import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export const cookieJar = new CookieJar();
export const client = wrapper(
  axios.create({ jar: cookieJar, withCredentials: true }),
);

/**
 * Fetches a URL with exponential backoff retry logic.
 * Useful for handling 429 Too Many Requests errors.
 *
 * @param url The URL to fetch
 * @param config Axios request configuration (headers, responseType, etc.)
 * @param retries Maximum number of retries
 * @param backoffMs Initial backoff delay in milliseconds
 * @returns Promise<AxiosResponse>
 */
export async function fetchWithRetry(
  url: string,
  config?: AxiosRequestConfig,
  retries: number = 5,
  backoffMs: number = 1000,
): Promise<AxiosResponse> {
  try {
    return await client(url, config);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 429 && retries > 0) {
        console.warn(
          `[429] Too Many Requests for ${url}. Retrying in ${backoffMs}ms... (${retries} retries left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        // Retry with exponentially increasing delay
        return fetchWithRetry(url, config, retries - 1, backoffMs * 2);
      }
    }
    throw error;
  }
}
