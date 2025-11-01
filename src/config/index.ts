import { config } from "dotenv";
import type { PgptClientConfig } from "../types/index.js";

/**
 * 환경 변수를 로드하고 PGPT 프록시 설정을 반환
 * - GPT와 Claude API 모두 사용 가능한 공통 프록시 설정
 * - PGPT_SYSTEM_CODE, PGPT_COMPANY_CODE가 있으면 커스텀 프록시 (base64 인코딩 방식)
 * - 없으면 표준 API (평문 API 키 방식)
 */
export function loadPgptConfig(): PgptClientConfig {
  // 환경 변수 로드
  config();

  const apiKey = process.env.PGPT_API_KEY;
  const systemCode = process.env.PGPT_SYSTEM_CODE;
  const companyCode = process.env.PGPT_COMPANY_CODE;
  const apiUrl = process.env.PGPT_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error(
      "환경 변수가 설정되지 않았습니다. PGPT_API_KEY, PGPT_API_URL을 확인하세요."
    );
  }

  const configResult: PgptClientConfig = {
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
