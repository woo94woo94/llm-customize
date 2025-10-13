/**
 * 공통 타입 정의
 */

/**
 * GPT API 클라이언트 설정
 * - customAuth가 있으면 커스텀 GPT API (base64 인코딩 방식)
 * - 없으면 표준 OpenAI API (평문 API 키 방식)
 */
export interface GptClientConfig {
  apiKey: string;
  apiUrl: string;
  customAuth?: {
    systemCode: string;
    companyCode: string;
  };
}

/**
 * 채팅 메시지
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * GPT API 요청 인터페이스
 */
export interface GptRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

/**
 * GPT API 응답 타입
 * any로 정의하여 다양한 응답 형식을 유연하게 처리
 */
export type GptResponse = any;
