import axios, { type AxiosInstance } from "axios";
import type {
  AnthropicClientConfig,
  AnthropicMessage,
  AnthropicResponse,
} from "../../types/index.js";
import {
  createAuthHeader,
  setupCustomAuthInterceptor,
  parseResponseIfNeeded,
} from "../../utils/auth.js";

// Tool 정의
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Anthropic API 직접 호출용 클라이언트 (axios 사용)
 *
 * @example
 * ```typescript
 * const client = new AnthropicClient({
 *   apiKey: process.env.ANTHROPIC_API_KEY!
 * });
 *
 * // 간단한 질문
 * const response = await client.chat({
 *   messages: [
 *     { role: "user", content: "안녕하세요" }
 *   ]
 * });
 * ```
 */
export class AnthropicClient {
  private axiosInstance: AxiosInstance;
  private config: AnthropicClientConfig;
  private anthropicVersion = "2023-06-01";

  constructor(config: AnthropicClientConfig) {
    if (!config.apiKey) {
      throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
    }

    this.config = config;

    // baseURL 설정 (우선순위: config.apiUrl > 기본값)
    const baseURL = config.apiUrl || "https://api.anthropic.com/v1";

    // customAuth 사용 시 기본 헤더만 설정, 아니면 x-api-key 포함
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": this.anthropicVersion,
    };

    // customAuth가 없으면 x-api-key 헤더 추가 (공식 Anthropic API)
    if (!config.customAuth) {
      headers["x-api-key"] = config.apiKey;
    }

    this.axiosInstance = axios.create({
      baseURL,
      headers,
      timeout: 120000, // 2분 타임아웃
    });

    // customAuth 사용 시 interceptor 설정
    setupCustomAuthInterceptor(this.axiosInstance, config.customAuth);
  }

  /**
   * Anthropic API 채팅 호출
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

      console.log("\n=== Request (Anthropic chat) ===");
      if (this.config.customAuth) {
        console.log("🔑 Using customAuth with Authorization header");
      }
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("=================================\n");

      const response = await this.axiosInstance.post<AnthropicResponse>(
        "/messages",
        requestBody,
        { headers }
      );

      console.log("\n=== Response (Anthropic chat) ===");
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("==================================\n");

      // customAuth 응답이 문자열로 올 수 있어 파싱
      const parsedData = parseResponseIfNeeded<AnthropicResponse>(response.data);

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
        throw new Error(`Anthropic API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

  /**
   * Tool을 포함한 Anthropic API 호출 (Raw 응답 반환)
   */
  async chatWithTools(options: {
    messages: AnthropicMessage[];
    tools: AnthropicTool[];
    model?: string;
    system?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<AnthropicResponse> {
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

      console.log("\n=== Request (Anthropic chatWithTools) ===");
      if (this.config.customAuth) {
        console.log("🔑 Using customAuth with Authorization header");
      }
      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("=========================================\n");

      const response = await this.axiosInstance.post<AnthropicResponse>(
        "/messages",
        requestBody,
        { headers }
      );

      console.log("\n=== Response (Anthropic chatWithTools) ===");
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("==========================================\n");

      // customAuth 응답이 문자열로 올 수 있어 파싱
      const parsedData = parseResponseIfNeeded<AnthropicResponse>(response.data);

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
        throw new Error(`Anthropic API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }
}
