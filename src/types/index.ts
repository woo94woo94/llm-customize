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

/**
 * Anthropic API 클라이언트 설정
 */
export interface AnthropicClientConfig {
  apiKey: string;
  apiUrl?: string; // 선택적, 기본값: https://api.anthropic.com/v1
  customAuth?: {
    systemCode: string;
    companyCode: string;
  };
}

/**
 * Anthropic API 메시지 타입
 */
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{
    type: "text" | "tool_use" | "tool_result";
    text?: string;
    id?: string;
    name?: string;
    input?: any;
    tool_use_id?: string;
    content?: any;
  }>;
}

/**
 * Anthropic API 요청 인터페이스
 */
export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  }>;
}

/**
 * Anthropic API 응답 타입
 */
export interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{
    type: "text" | "tool_use";
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
