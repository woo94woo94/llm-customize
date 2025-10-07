import { AIMessage, BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import {
  BaseChatModel,
  type BaseChatModelCallOptions,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import type { GptClientConfig, GptResponse } from "../../types/index.js";

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
  systemCode: string;
  companyCode: string;
  apiUrl: string;
  model: string;
  temperature: number;
  topK: number;

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
    this.systemCode = fields.systemCode;
    this.companyCode = fields.companyCode;
    this.apiUrl = fields.apiUrl;
    this.model = fields.model || "gpt-4o";
    this.temperature = fields.temperature ?? 0.7;
    this.topK = fields.topK ?? 5;
  }

  /**
   * Authorization 헤더 생성: JSON을 Base64로 인코딩
   */
  private createAuthHeader(): string {
    const authJson = {
      apiKey: this.apiKey,
      systemCode: this.systemCode,
      companyCode: this.companyCode,
    };

    const jsonString = JSON.stringify(authJson);
    const base64Encoded = Buffer.from(jsonString).toString("base64");

    return `Bearer ${base64Encoded}`;
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

    const requestBody = {
      messages: formattedMessages,
      model: this.model,
      temperature: this.temperature,
      topK: this.topK,
    };

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

      // 응답에서 content 추출 (여러 형식 지원)
      let content = "";

      if (data.choices && data.choices.length > 0) {
        const firstChoice = data.choices[0];
        if (firstChoice && firstChoice.message?.content) {
          content = firstChoice.message.content;
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

      const message = new AIMessage({ content });

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
}
