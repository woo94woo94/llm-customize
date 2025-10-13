import axios, { type AxiosInstance } from "axios";
import type {
  GptClientConfig,
  GptRequest,
  GptResponse,
  ChatMessage,
} from "../../types/index.js";

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
 * GPT API 직접 호출용 클라이언트
 *
 * @example
 * ```typescript
 * import { loadConfig } from "../../config/index.js";
 *
 * const config = loadConfig();
 * const client = new ApiClient(config);
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
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: GptClientConfig;

  constructor(config: GptClientConfig) {
    if (!config.apiUrl) {
      throw new Error(
        "GPT_API_URL 환경변수가 설정되지 않았습니다."
      );
    }

    this.config = config;

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Authorization 헤더 생성
   * - customAuth가 있으면: JSON을 Base64로 인코딩 (커스텀 GPT API)
   * - customAuth가 없으면: 평문 API 키 사용 (표준 OpenAI API)
   */
  private createAuthHeader(): string {
    if (this.config.customAuth) {
      // 커스텀 GPT API 방식: base64 인코딩
      const authJson = {
        apiKey: this.config.apiKey,
        systemCode: this.config.customAuth.systemCode,
        companyCode: this.config.customAuth.companyCode,
      };

      const jsonString = JSON.stringify(authJson);
      const base64Encoded = Buffer.from(jsonString).toString("base64");

      return `Bearer ${base64Encoded}`;
    } else {
      // 표준 OpenAI API 방식: 평문 API 키
      return `Bearer ${this.config.apiKey}`;
    }
  }

  /**
   * GPT API 채팅 호출
   */
  async chat(request: GptRequest): Promise<string> {
    try {
      // 요청 바디 구성
      const requestBody: any = {
        messages: request.messages,
        model: request.model || "gpt-4o",
        temperature: request.temperature ?? 0.7,
      };

      const authHeader = this.createAuthHeader();
      console.log("🔑 Request Headers:", {
        "Content-Type": "application/json",
        Authorization: authHeader,
      });

      const response = await this.axiosInstance.post<GptResponse>(
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
        throw new Error(`GPT API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

  /**
   * Tool을 포함한 GPT API 호출 (Raw 응답 반환)
   */
  async chatWithTools(
    messages: ChatMessage[],
    tools: Tool[],
    options?: {
      model?: string;
      temperature?: number;
    }
  ): Promise<GptResponse> {
    try {
      const requestBody: any = {
        messages,
        model: options?.model || "gpt-4o",
        temperature: options?.temperature ?? 0.7,
        tools,
      };

      const authHeader = this.createAuthHeader();
      console.log("🔑 Request Headers:", {
        "Content-Type": "application/json",
        Authorization: authHeader,
      });

      const response = await this.axiosInstance.post<GptResponse>(
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
      console.log("Response headers:", response.headers);
      console.log("Response data type:", typeof response.data);
      console.log("Response data:", response.data);

      // customAuth를 사용하는 경우 응답이 문자열로 올 수 있음
      if (typeof response.data === "string") {
        console.log("\n📝 Response is string, attempting to parse...");
        console.log("String length:", response.data.length);
        console.log("First 200 chars:", response.data.substring(0, 200));
        console.log("Last 200 chars:", response.data.substring(Math.max(0, response.data.length - 200)));

        try {
          const parsed = JSON.parse(response.data);
          console.log("✅ JSON parsing successful");
          console.log("Parsed data type:", typeof parsed);
          console.log("Parsed data:", parsed);
          return parsed;
        } catch (parseError) {
          console.error("\n❌ JSON Parse Error Details:");
          console.error("Error:", parseError);
          console.error("Raw string (full):", response.data);
          throw parseError;
        }
      }

      console.log("✅ Response data is already object, returning as-is");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || "No response";
        const data = error.response?.data
          ? JSON.stringify(error.response.data)
          : "No data";
        const message = error.message || "Unknown error";
        throw new Error(`GPT API error: ${status} - ${data} (${message})`);
      }
      throw error;
    }
  }

  /**
   * GPT API 스트리밍 호출
   */
  async *chatStream(request: GptRequest): AsyncGenerator<string> {
    try {
      const requestBody: any = {
        messages: request.messages,
        model: request.model || "gpt-4o",
        temperature: request.temperature ?? 0.7,
        stream: true,
      };

      const authHeader = this.createAuthHeader();
      console.log("🔑 Request Headers (Streaming):", {
        "Content-Type": "application/json",
        Authorization: authHeader,
      });

      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPT API error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const jsonStr = trimmed.slice(6);
              const data = JSON.parse(jsonStr);

              // OpenAI 스트리밍 형식
              if (data.choices?.[0]?.delta?.content) {
                yield data.choices[0].delta.content;
              }
            } catch (e) {
              // JSON 파싱 실패 시 무시
              continue;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to stream GPT API: ${error.message}`);
      }
      throw error;
    }
  }
}
