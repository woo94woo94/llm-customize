import axios, { type AxiosInstance } from "axios";
import type {
  PgptClientConfig,
  AnthropicMessage,
  PgptAnthropicResponse,
} from "../../types/index.js";
import {
  createAuthHeader,
  setupCustomAuthInterceptor,
  parseResponseIfNeeded,
} from "../../utils/auth.js";

// Tool 정의
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * PGPT 프록시 API 직접 호출용 클라이언트 (Claude 모델용)
 *
 * @example
 * ```typescript
 * import { loadPgptConfig } from "../../config/index.js";
 *
 * const config = loadPgptConfig();
 * const client = new ClaudeClient(config);
 *
 * // 간단한 질문
 * const response = await client.chat({
 *   messages: [
 *     { role: "user", content: "안녕하세요" }
 *   ]
 * });
 * ```
 */
export class ClaudeClient {
  private axiosInstance: AxiosInstance;
  private config: PgptClientConfig;

  constructor(config: PgptClientConfig) {
    if (!config.apiKey || !config.apiUrl) {
      throw new Error("PGPT_API_KEY, PGPT_API_URL 환경변수가 설정되지 않았습니다.");
    }

    this.config = config;

    // customAuth 사용 시 기본 헤더만 설정, 아니면 x-api-key 포함
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // customAuth가 없으면 x-api-key 헤더 추가 (공식 Anthropic API)
    if (!config.customAuth) {
      headers["x-api-key"] = config.apiKey;
    }

    this.axiosInstance = axios.create({
      baseURL: config.apiUrl, // PGPT_API_URL 사용 (프록시가 라우팅)
      headers,
      timeout: 120000, // 2분 타임아웃
    });

    // customAuth 사용 시 interceptor 설정
    setupCustomAuthInterceptor(this.axiosInstance, config.customAuth);
  }

  /**
   * PGPT API 채팅 호출 (Claude 모델)
   */
  async chat(options: {
    messages: AnthropicMessage[];
    model?: string;
    system?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<string> {
    try {
      const requestBody = {
        model: options.model || "claude-sonnet-4-5-20250929",
        messages: options.messages,
        max_tokens: options.max_tokens || 4096,
        ...(options.system && { system: options.system }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      };

      // customAuth 사용 시 Authorization 헤더 추가
      const headers: Record<string, string> = {};
      if (this.config.customAuth) {
        headers["Authorization"] = createAuthHeader(
          this.config.apiKey,
          this.config.customAuth
        );
      }

      console.log("\n=== Request (Claude chat) ===");
      console.log("📋 Headers:", JSON.stringify({
        ...this.axiosInstance.defaults.headers,
        ...headers
      }, null, 2));
      if (this.config.customAuth) {
        console.log("🔑 Using customAuth with Authorization header");
      }
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("=================================\n");

      const response = await this.axiosInstance.post<PgptAnthropicResponse>(
        "",
        requestBody,
        { headers }
      );

      console.log("\n=== Response (Claude chat) ===");
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("==================================\n");

      // customAuth 응답이 문자열로 올 수 있어 파싱
      const parsedData = parseResponseIfNeeded<PgptAnthropicResponse>(response.data);

      // content에서 텍스트 추출
      const textContent = parsedData.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");

      return textContent;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || "No response";
        const data = error.response?.data
          ? JSON.stringify(error.response.data)
          : "No data";
        const message = error.message || "Unknown error";
        throw new Error(`PGPT Claude API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

  /**
   * Tool을 포함한 PGPT API 호출 (Claude 모델, Raw 응답 반환)
   */
  async chatWithTools(options: {
    messages: AnthropicMessage[];
    tools: ClaudeTool[];
    model?: string;
    system?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<PgptAnthropicResponse> {
    try {
      const requestBody = {
        model: options.model || "claude-sonnet-4-5-20250929",
        messages: options.messages,
        max_tokens: options.max_tokens || 4096,
        tools: options.tools,
        ...(options.system && { system: options.system }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      };

      // customAuth 사용 시 Authorization 헤더 추가
      const headers: Record<string, string> = {};
      if (this.config.customAuth) {
        headers["Authorization"] = createAuthHeader(
          this.config.apiKey,
          this.config.customAuth
        );
      }

      console.log("\n=== Request (Claude chatWithTools) ===");
      console.log("📋 Headers:", JSON.stringify({
        ...this.axiosInstance.defaults.headers,
        ...headers
      }, null, 2));
      if (this.config.customAuth) {
        console.log("🔑 Using customAuth with Authorization header");
      }
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("=========================================\n");

      const response = await this.axiosInstance.post<PgptAnthropicResponse>(
        "",
        requestBody,
        { headers }
      );

      console.log("\n=== Response (Claude chatWithTools) ===");
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("==========================================\n");

      // customAuth 응답이 문자열로 올 수 있어 파싱
      const parsedData = parseResponseIfNeeded<PgptAnthropicResponse>(response.data);

      console.log("Stop reason:", parsedData.stop_reason);
      console.log("Content types:", parsedData.content.map(c => c.type).join(", "));

      return parsedData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || "No response";
        const data = error.response?.data
          ? JSON.stringify(error.response.data)
          : "No data";
        const message = error.message || "Unknown error";
        throw new Error(`PGPT Claude API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }
}
