import axios, { type AxiosInstance } from "axios";
import type {
  GptClientConfig,
  GptRequest,
  GptResponse,
} from "../../types/index.js";

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
  private config: Required<GptClientConfig>;

  constructor(config: GptClientConfig) {
    if (!config.apiUrl) {
      throw new Error(
        "GPT_API_URL 환경변수가 설정되지 않았습니다."
      );
    }

    this.config = {
      ...config,
      apiUrl: config.apiUrl,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Authorization 헤더 생성: JSON을 Base64로 인코딩
   */
  private createAuthHeader(): string {
    const authJson = {
      apiKey: this.config.apiKey,
      systemCode: this.config.systemCode,
      companyCode: this.config.companyCode,
    };

    const jsonString = JSON.stringify(authJson);
    const base64Encoded = Buffer.from(jsonString).toString("base64");

    return `Bearer ${base64Encoded}`;
  }

  /**
   * GPT API 채팅 호출
   */
  async chat(request: GptRequest): Promise<string> {
    try {
      const response = await this.axiosInstance.post<GptResponse>(
        "",
        {
          messages: request.messages,
          model: request.model || "gpt-4o",
          temperature: request.temperature ?? 0.7,
          topK: request.topK ?? 5,
        },
        {
          headers: {
            Authorization: this.createAuthHeader(),
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
}
