/**
 * 공통 타입 정의
 */

/**
 * PGPT 프록시 API 클라이언트 설정
 * - GPT와 Claude API 모두 사용 가능한 공통 프록시 설정
 * - customAuth가 있으면 커스텀 프록시 (base64 인코딩 방식)
 * - 없으면 표준 API (평문 API 키 방식)
 */
export interface PgptClientConfig {
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
 * PGPT API 요청 인터페이스 (GPT 모델용)
 */
export interface PgptRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

/**
 * PGPT API 응답 타입 (GPT 모델용)
 * any로 정의하여 다양한 응답 형식을 유연하게 처리
 */
export type PgptResponse = any;

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
 * PGPT API 요청 인터페이스 (Anthropic/Claude 모델용)
 */
export interface PgptAnthropicRequest {
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
 * PGPT API 응답 타입 (Anthropic/Claude 모델용)
 */
export interface PgptAnthropicResponse {
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
