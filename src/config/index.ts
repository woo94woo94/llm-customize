import { config } from "dotenv";
import type { GptClientConfig, AnthropicClientConfig } from "../types/index.js";

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

/**
 * 환경 변수를 로드하고 Anthropic 클라이언트 설정을 반환
 * - ANTHROPIC_SYSTEM_CODE, ANTHROPIC_COMPANY_CODE가 있으면 커스텀 프록시 방식
 * - 없으면 공식 Anthropic API 방식
 */
export function loadAnthropicConfig(): AnthropicClientConfig {
  // 환경 변수 로드
  config();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const apiUrl = process.env.ANTHROPIC_API_URL;
  const systemCode = process.env.ANTHROPIC_SYSTEM_CODE;
  const companyCode = process.env.ANTHROPIC_COMPANY_CODE;

  if (!apiKey) {
    throw new Error(
      "환경 변수가 설정되지 않았습니다. ANTHROPIC_API_KEY를 확인하세요."
    );
  }

  const configResult: AnthropicClientConfig = {
    apiKey,
  };

  // apiUrl이 있으면 추가 (없으면 AnthropicClient에서 기본값 사용)
  if (apiUrl) {
    configResult.apiUrl = apiUrl;
  }

  // 커스텀 인증 정보가 있으면 추가
  if (systemCode && companyCode) {
    configResult.customAuth = {
      systemCode,
      companyCode,
    };
  }

  return configResult;
}
