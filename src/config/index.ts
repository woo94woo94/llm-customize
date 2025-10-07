import { config } from "dotenv";
import type { GptClientConfig } from "../types/index.js";

/**
 * 환경 변수를 로드하고 GPT 클라이언트 설정을 반환
 * - GPT_SYSTEM_CODE, GPT_COMPANY_CODE가 있으면 커스텀 GPT API 방식
 * - 없으면 표준 OpenAI API 방식
 */
export function loadConfig(): GptClientConfig {
  // 환경 변수 로드
  config();

  const apiKey = process.env.GPT_API_KEY;
  const systemCode = process.env.GPT_SYSTEM_CODE;
  const companyCode = process.env.GPT_COMPANY_CODE;
  const apiUrl = process.env.GPT_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error(
      "환경 변수가 설정되지 않았습니다. GPT_API_KEY, GPT_API_URL을 확인하세요."
    );
  }

  const configResult: GptClientConfig = {
    apiKey,
    apiUrl,
  };

  // 커스텀 인증 정보가 있으면 추가
  if (systemCode && companyCode) {
    configResult.customAuth = {
      systemCode,
      companyCode,
    };
  }

  return configResult;
}
