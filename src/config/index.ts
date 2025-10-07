import { config } from "dotenv";
import type { GptClientConfig } from "../types/index.js";

/**
 * 환경 변수를 로드하고 GPT 클라이언트 설정을 반환
 */
export function loadConfig(): GptClientConfig {
  // 환경 변수 로드
  config();

  const apiKey = process.env.GPT_API_KEY;
  const systemCode = process.env.GPT_SYSTEM_CODE;
  const companyCode = process.env.GPT_COMPANY_CODE;
  const apiUrl = process.env.GPT_API_URL;

  if (!apiKey || !systemCode || !companyCode || !apiUrl) {
    throw new Error(
      "환경 변수가 설정되지 않았습니다. GPT_API_KEY, GPT_SYSTEM_CODE, GPT_COMPANY_CODE, GPT_API_URL을 확인하세요."
    );
  }

  return {
    apiKey,
    systemCode,
    companyCode,
    apiUrl,
  };
}
