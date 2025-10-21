import { AIMessage, BaseMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
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
  }

  /**
   * Authorization 헤더 생성
   */
  private createAuthHeader(): string {
    if (this.customAuth) {
      const authJson = {
        apiKey: this.apiKey,
        systemCode: this.customAuth.systemCode,
        companyCode: this.customAuth.companyCode,
      };
      const base64Encoded = Buffer.from(JSON.stringify(authJson)).toString("base64");
      return `Bearer ${base64Encoded}`;
    }
    return `Bearer ${this.apiKey}`;
  }

  /**
   * LangChain 메시지를 GPT API 형식으로 변환
   */
  private formatMessages(
    messages: BaseMessage[]
  ): Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: any[] }> {
    return messages.map((msg) => {
      let role = "user";

      if (msg instanceof SystemMessage) {
        role = "system";
      } else if (msg instanceof AIMessage) {
        role = "assistant";
      } else if (msg instanceof ToolMessage) {
        role = this.customAuth ? "user" : "tool";
      }

      let content: string | null =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);

      // customAuth: ToolMessage에 tool 이름 포함
      if (msg instanceof ToolMessage && this.customAuth && "name" in msg) {
        content = `${(msg as any).name} 결과: ${content}`;
      }

      const result: { role: string; content: string | null; tool_call_id?: string; tool_calls?: any[] } = {
        role,
        content,
      };

      // 표준 API: tool_call_id 추가
      if (msg instanceof ToolMessage && "tool_call_id" in msg && !this.customAuth) {
        result.tool_call_id = (msg as any).tool_call_id;
      }

      // AI 메시지의 tool_calls 처리
      if (msg instanceof AIMessage && "tool_calls" in msg && Array.isArray((msg as any).tool_calls) && (msg as any).tool_calls.length > 0) {
        if (!this.customAuth) {
          // 표준 API: tool_calls 포함
          result.tool_calls = (msg as any).tool_calls.map((tc: any) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          }));
          // content를 null로 설정
          if (!result.content || result.content === "") {
            result.content = null;
          }
        } else {
          // customAuth: tool_calls 제거, content 빈 문자열 유지
          if (!result.content || result.content === "") {
            result.content = "";
          }
        }
      }

      return result;
    });
  }

  /**
   * 응답에서 content와 tool_calls 추출
   */
  private parseResponse(responseText: string): { content: string; toolCalls: any[] } {
    let content = "";
    let toolCalls: any[] = [];

    try {
      const data = JSON.parse(responseText) as GptResponse;

      if (data.choices && data.choices.length > 0) {
        const firstChoice = data.choices[0];

        if (firstChoice?.message?.content) {
          content = firstChoice.message.content;
        }

        if (firstChoice?.message?.tool_calls) {
          toolCalls = firstChoice.message.tool_calls.map((tc: any) => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
            id: tc.id,
            type: "tool_call",
          }));
        }
      }

      // content가 없는 경우 대체 필드 확인
      if (!content && toolCalls.length === 0) {
        content = data.response || data.answer || data.result || JSON.stringify(data);
      }
    } catch (parseError) {
      // JSON 파싱 실패 시 raw text 사용
      content = responseText;
    }

    return { content, toolCalls };
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

    const requestBody: any = {
      messages: formattedMessages,
      model: this.model,
      temperature: this.temperature,
    };

    if (this.customAuth) {
      requestBody.need_origin = true;
    }

    if (this.tools && this.tools.length > 0) {
      requestBody.tools = this.tools.map((tool) => {
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

      const responseText = await response.text();
      const { content, toolCalls } = this.parseResponse(responseText);

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
  bindTools(tools: StructuredToolInterface[]): ChatCustomGpt {
    const params: ChatCustomGptParams = {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
      model: this.model,
      temperature: this.temperature,
    };
    if (this.customAuth) {
      params.customAuth = this.customAuth;
    }
    const newInstance = new ChatCustomGpt(params);
    newInstance.tools = tools;
    return newInstance;
  }

}
