import { AIMessage, AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import {
  BaseChatModel,
  type BaseChatModelCallOptions,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import type { GptClientConfig, GptResponse } from "../../types/index.js";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { zodToJsonSchema } from "zod-to-json-schema";

interface ChatCustomGptOptions extends BaseChatModelCallOptions {}

interface ChatCustomGptParams extends BaseChatModelParams, GptClientConfig {
  model?: string;
  temperature?: number;
  topK?: number;
}

/**
 * LangChain 호환 Custom GPT 채팅 모델
 *
 * @example
 * ```typescript
 * import { loadConfig } from "../../config/index.js";
 *
 * const config = loadConfig();
 * const model = new ChatCustomGpt({
 *   ...config,
 *   temperature: 0.7,
 * });
 *
 * const response = await model.invoke("안녕하세요");
 * console.log(response.content);
 * ```
 */
export class ChatCustomGpt extends BaseChatModel<ChatCustomGptOptions> {
  apiKey: string;
  apiUrl: string;
  customAuth?: {
    systemCode: string;
    companyCode: string;
  };
  model: string;
  temperature: number;
  topK: number;
  tools?: StructuredToolInterface[];

  static lc_name(): string {
    return "ChatCustomGpt";
  }

  constructor(fields: ChatCustomGptParams) {
    super(fields);

    if (!fields.apiUrl) {
      throw new Error(
        "GPT_API_URL 환경변수가 설정되지 않았습니다."
      );
    }

    this.apiKey = fields.apiKey;
    this.apiUrl = fields.apiUrl;
    if (fields.customAuth) {
      this.customAuth = fields.customAuth;
    }
    this.model = fields.model || "gpt-4o";
    this.temperature = fields.temperature ?? 0.7;
    this.topK = fields.topK ?? 5;
  }

  /**
   * Authorization 헤더 생성
   * - customAuth가 있으면: JSON을 Base64로 인코딩 (커스텀 GPT API)
   * - customAuth가 없으면: 평문 API 키 사용 (표준 OpenAI API)
   */
  private createAuthHeader(): string {
    if (this.customAuth) {
      // 커스텀 GPT API 방식: base64 인코딩
      const authJson = {
        apiKey: this.apiKey,
        systemCode: this.customAuth.systemCode,
        companyCode: this.customAuth.companyCode,
      };

      const jsonString = JSON.stringify(authJson);
      const base64Encoded = Buffer.from(jsonString).toString("base64");

      return `Bearer ${base64Encoded}`;
    } else {
      // 표준 OpenAI API 방식: 평문 API 키
      return `Bearer ${this.apiKey}`;
    }
  }

  /**
   * LangChain 메시지를 GPT API 형식으로 변환
   */
  private formatMessages(
    messages: BaseMessage[]
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      const msgType = msg._getType();
      let role = "user";

      if (msgType === "system") {
        role = "system";
      } else if (msgType === "ai") {
        role = "assistant";
      }

      return {
        role,
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      };
    });
  }

  async _generate(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    if (!messages.length) {
      throw new Error("No messages provided.");
    }

    const formattedMessages = this.formatMessages(messages);

    // 요청 바디 구성
    const requestBody: any = {
      messages: formattedMessages,
      model: this.model,
      temperature: this.temperature,
    };

    // 커스텀 GPT API인 경우에만 topK 추가
    if (this.customAuth) {
      requestBody.topK = this.topK;
    }

    // tools가 있으면 OpenAI API 형식으로 추가
    if (this.tools && this.tools.length > 0) {
      requestBody.tools = this.tools.map((tool) => {
        // Zod schema인 경우 JSON Schema로 변환
        let parameters = tool.schema;
        if (parameters && typeof parameters === "object" && "_def" in parameters) {
          parameters = zodToJsonSchema(parameters as any);
        }

        return {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters,
          },
        };
      });
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.createAuthHeader(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPT API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as GptResponse;

      // 응답에서 content 및 tool_calls 추출
      let content = "";
      let toolCalls: any[] = [];

      if (data.choices && data.choices.length > 0) {
        const firstChoice = data.choices[0];
        if (firstChoice && firstChoice.message?.content) {
          content = firstChoice.message.content;
        }
        // tool_calls 추출
        if (firstChoice && firstChoice.message?.tool_calls) {
          toolCalls = firstChoice.message.tool_calls.map((tc: any) => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
            id: tc.id,
            type: "tool_call",
          }));
        }
      }

      if (!content && data.response) {
        content = data.response;
      } else if (!content && data.answer) {
        content = data.answer;
      } else if (!content && data.result) {
        content = data.result;
      } else if (!content) {
        content = JSON.stringify(data);
      }

      const message = new AIMessage({
        content,
        tool_calls: toolCalls,
      });

      return {
        generations: [{ message, text: content }],
        llmOutput: {},
      };
    } catch (error) {
      throw new Error(`Failed to call GPT API: ${error}`);
    }
  }

  _llmType(): string {
    return "custom_gpt";
  }

  /**
   * Tool을 모델에 바인딩
   */
  bindTools(
    tools: StructuredToolInterface[],
    kwargs?: Record<string, any>
  ): ChatCustomGpt {
    const params: ChatCustomGptParams = {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
      model: this.model,
      temperature: this.temperature,
      topK: this.topK,
    };
    if (this.customAuth) {
      params.customAuth = this.customAuth;
    }
    const newInstance = new ChatCustomGpt(params);
    newInstance.tools = tools;
    return newInstance;
  }

  /**
   * 스트리밍 생성 (토큰 단위로 응답 반환)
   */
  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    if (!messages.length) {
      throw new Error("No messages provided.");
    }

    const formattedMessages = this.formatMessages(messages);

    // 요청 바디 구성
    const requestBody: any = {
      messages: formattedMessages,
      model: this.model,
      temperature: this.temperature,
      stream: true, // 스트리밍 모드 활성화
    };

    // 커스텀 GPT API인 경우에만 topK 추가
    if (this.customAuth) {
      requestBody.topK = this.topK;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.createAuthHeader(),
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
                const content = data.choices[0].delta.content;

                // ChatGenerationChunk yield
                yield new ChatGenerationChunk({
                  message: new AIMessageChunk({ content }),
                  text: content,
                });

                // 콜백 트리거
                await runManager?.handleLLMNewToken(content);
              }
            } catch (e) {
              // JSON 파싱 실패 시 무시
              continue;
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to stream GPT API: ${error}`);
    }
  }
}
