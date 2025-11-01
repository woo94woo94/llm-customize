import type { AxiosInstance } from "axios";

/**
 * customAuth 설정 타입
 */
export interface CustomAuth {
  systemCode: string;
  companyCode: string;
}

/**
 * Authorization 헤더 생성
 * - customAuth가 있으면: JSON을 Base64로 인코딩 (커스텀 프록시 API)
 * - customAuth가 없으면: 평문 API 키 사용 (표준 API)
 */
export function createAuthHeader(
  apiKey: string,
  customAuth?: CustomAuth
): string {
  if (customAuth) {
    // 커스텀 프록시 API 방식: base64 인코딩
    const authJson = {
      apiKey,
      systemCode: customAuth.systemCode,
      companyCode: customAuth.companyCode,
    };

    const jsonString = JSON.stringify(authJson);
    const base64Encoded = Buffer.from(jsonString).toString("base64");

    return `Bearer ${base64Encoded}`;
  } else {
    // 표준 API 방식: 평문 API 키
    return `Bearer ${apiKey}`;
  }
}

/**
 * customAuth 사용 시 POST 요청에 need_origin: true를 자동으로 추가하는 interceptor 설정
 */
export function setupCustomAuthInterceptor(
  axiosInstance: AxiosInstance,
  customAuth?: CustomAuth
): void {
  if (customAuth) {
    axiosInstance.interceptors.request.use((config) => {
      if (config.method === "post" && config.data) {
        config.data = {
          ...config.data,
          need_origin: true,
        };
      }
      return config;
    });
  }
}

/**
 * customAuth 응답이 문자열로 올 수 있어 파싱이 필요한지 확인하고 파싱
 */
export function parseResponseIfNeeded<T = any>(data: any): T {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error("Failed to parse response string:", error);
      throw error;
    }
  }
  return data as T;
}
