import axios, { type AxiosInstance } from "axios";
import type {
  PgptClientConfig,
  PgptRequest,
  PgptResponse,
  ChatMessage,
} from "../../types/index.js";
import {
  createAuthHeader,
  setupCustomAuthInterceptor,
  parseResponseIfNeeded,
} from "../../utils/auth.js";

// Tool 정의
export interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// Tool call 응답
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * PGPT 프록시 API 직접 호출용 클라이언트 (GPT 모델용)
 *
 * @example
 * ```typescript
 * import { loadPgptConfig } from "../../config/index.js";
 *
 * const config = loadPgptConfig();
 * const client = new GptClient(config);
 *
 * // 간단한 질문
 * const response = await client.chat({
 *   messages: [
 *     { role: "user", content: "안녕하세요" }
 *   ]
 * });
 *
 * // 시스템 프롬프트 포함
 * const response2 = await client.chat({
 *   messages: [
 *     { role: "system", content: "당신은 AI입니다" },
 *     { role: "user", content: "안녕하세요" }
 *   ]
 * });
 * ```
 */
export class GptClient {
  private axiosInstance: AxiosInstance;
  private config: PgptClientConfig;

  constructor(config: PgptClientConfig) {
    if (!config.apiUrl) {
      throw new Error(
        "PGPT_API_URL 환경변수가 설정되지 않았습니다."
      );
    }

    this.config = config;

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // customAuth 사용 시 interceptor 설정
    setupCustomAuthInterceptor(this.axiosInstance, this.config.customAuth);
  }

  /**
   * PGPT API 채팅 호출 (GPT 모델)
   */
  async chat(request: PgptRequest): Promise<string> {
    try {
      // 요청 바디 구성
      const requestBody: any = {
        messages: request.messages,
        model: request.model || "gpt-4o",
        temperature: request.temperature ?? 0.7,
      };

      const authHeader = createAuthHeader(this.config.apiKey, this.config.customAuth);

      console.log("\n=== Request (chat) ===");
      console.log("🔑 Request Headers:", {
        "Content-Type": "application/json",
        Authorization: authHeader,
      });
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("======================\n");

      const response = await this.axiosInstance.post<PgptResponse>(
        "",
        requestBody,
        {
          headers: {
            Authorization: authHeader,
          },
        }
      );

      // 응답에서 content 추출 (여러 형식 지원)
      const data = response.data;

      if (data.choices && data.choices.length > 0) {
        const firstChoice = data.choices[0];
        if (firstChoice && firstChoice.message?.content) {
          return firstChoice.message.content;
        }
      }

      if (data.response) {
        return data.response;
      } else if (data.answer) {
        return data.answer;
      } else if (data.result) {
        return data.result;
      }

      return JSON.stringify(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || "No response";
        const data = error.response?.data
          ? JSON.stringify(error.response.data)
          : "No data";
        const message = error.message || "Unknown error";
        throw new Error(`PGPT API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

  /**
   * Structured Output을 사용한 PGPT API 호출 (GPT 모델)
   */
  async chatWithStructuredOutput<T = any>(
    messages: ChatMessage[],
    schema: {
      name: string;
      description?: string;
      schema: Record<string, any>;
    },
    options?: {
      model?: string;
      temperature?: number;
    }
  ): Promise<T> {
    try {
      const requestBody: any = {
        messages,
        model: options?.model || "gpt-4o",
        temperature: options?.temperature ?? 0.7,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schema.name,
            description: schema.description,
            strict: true,
            schema: schema.schema,
          },
        },
      };

      const authHeader = createAuthHeader(this.config.apiKey, this.config.customAuth);

      console.log("\n=== Request (chatWithStructuredOutput) ===");
      console.log("🔑 Request Headers:", {
        "Content-Type": "application/json",
        Authorization: authHeader,
      });
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("==========================================\n");

      const response = await this.axiosInstance.post<PgptResponse>(
        "",
        requestBody,
        {
          headers: {
            Authorization: authHeader,
          },
        }
      );

      console.log("\n=== Response (chatWithStructuredOutput) ===");
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("===========================================\n");

      const data = response.data;

      if (data.choices && data.choices.length > 0) {
        const firstChoice = data.choices[0];
        if (firstChoice && firstChoice.message?.content) {
          // content가 JSON 문자열이므로 파싱
          return JSON.parse(firstChoice.message.content) as T;
        }
      }

      throw new Error("No structured output in response");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || "No response";
        const data = error.response?.data
          ? JSON.stringify(error.response.data)
          : "No data";
        const message = error.message || "Unknown error";
        throw new Error(`PGPT API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

  /**
   * Tool을 포함한 PGPT API 호출 (GPT 모델, Raw 응답 반환)
   */
  async chatWithTools(
    messages: ChatMessage[],
    tools: Tool[],
    options?: {
      model?: string;
      temperature?: number;
    }
  ): Promise<PgptResponse> {
    try {
      const requestBody: any = {
        messages,
        model: options?.model || "gpt-4o",
        temperature: options?.temperature ?? 0.7,
        tools,
      };

      const authHeader = createAuthHeader(this.config.apiKey, this.config.customAuth);

      console.log("\n=== Request (chatWithTools) ===");
      console.log("🔑 Request Headers:", {
        "Content-Type": "application/json",
        Authorization: authHeader,
      });
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("================================\n");

      const response = await this.axiosInstance.post<PgptResponse>(
        "",
        requestBody,
        {
          headers: {
            Authorization: authHeader,
          },
        }
      );

      console.log("\n=== Response Analysis (chatWithTools) ===");
      console.log("Response status:", response.status);
      console.log("Response data type:", typeof response.data);
      console.log("Response data:", response.data);

      // customAuth를 사용하는 경우 응답이 문자열로 올 수 있음
      const parsedData = parseResponseIfNeeded<PgptResponse>(response.data);

      console.log("✅ Response processed successfully");
      return parsedData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || "No response";
        const data = error.response?.data
          ? JSON.stringify(error.response.data)
          : "No data";
        const message = error.message || "Unknown error";
        throw new Error(`PGPT API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

}
