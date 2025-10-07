/**
 * 공통 타입 정의
 */

/**
 * GPT API 클라이언트 설정
 */
export interface GptClientConfig {
  apiKey: string;
  systemCode: string;
  companyCode: string;
  apiUrl: string;
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
  topK?: number;
}

/**
 * GPT API 응답 인터페이스
 */
export interface GptResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  response?: string;
  answer?: string;
  result?: string;
}
