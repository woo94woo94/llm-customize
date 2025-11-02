import { AIMessage, BaseMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import {
  BaseChatModel,
  type BaseChatModelCallOptions,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import type { PgptClientConfig, PgptResponse } from "../../types/index.js";
import type { StructuredToolInterface } from "@langchain/core/tools";
import axios from "axios";

interface ChatPgptGptOptions extends BaseChatModelCallOptions {}

interface ChatPgptGptParams extends BaseChatModelParams, PgptClientConfig {
  model?: string;
  temperature?: number;
}

/**
 * LangChain 호환 PGPT 프록시 채팅 모델 (GPT 전용)
 *
 * @example
 * ```typescript
 * import { loadPgptConfig } from "../../config/index.js";
 *
 * const config = loadPgptConfig();
 * const model = new ChatPgptGpt({
 *   ...config,
 *   model: "gpt-4o",
 *   temperature: 0.7,
 * });
 *
 * const response = await model.invoke("안녕하세요");
 * console.log(response.content);
 * ```
 */
export class ChatPgptGpt extends BaseChatModel<ChatPgptGptOptions> {
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
    return "ChatPgptGpt";
  }

  constructor(fields: ChatPgptGptParams) {
    super(fields);

    if (!fields.apiUrl) {
      throw new Error(
        "PGPT_API_URL 환경변수가 설정되지 않았습니다."
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
   * LangChain 메시지를 PGPT API 형식으로 변환
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
   * 응답에서 content와 tool_calls 추출 (OpenAI 형식 전용)
   */
  private parseResponse(data: PgptResponse): { content: string; toolCalls: any[] } {
    // OpenAI 형식 검증
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error(
        `Invalid OpenAI API response format. Expected 'choices' array but got: ${JSON.stringify(data).substring(0, 200)}`
      );
    }

    const firstChoice = data.choices[0];
    if (!firstChoice?.message) {
      throw new Error(
        `Invalid OpenAI API response format. Expected 'message' in choices[0] but got: ${JSON.stringify(firstChoice).substring(0, 200)}`
      );
    }

    let content = firstChoice.message.content || "";
    let toolCalls: any[] = [];

    // tool_calls 파싱
    if (firstChoice.message.tool_calls && Array.isArray(firstChoice.message.tool_calls)) {
      toolCalls = firstChoice.message.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
        id: tc.id,
        type: "tool_call",
      }));
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
      requestBody.tools = this.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.schema,
        },
      }));
    }

    try {
      const response = await axios.post<PgptResponse | string>(
        this.apiUrl,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: this.createAuthHeader(),
          },
        }
      );

      // customAuth 응답이 문자열로 올 수 있어 파싱
      let data: PgptResponse;
      if (typeof response.data === 'string') {
        try {
          data = JSON.parse(response.data);
        } catch (parseError) {
          throw new Error(`Failed to parse GPT API response: ${response.data.substring(0, 200)}`);
        }
      } else {
        data = response.data;
      }

      const { content, toolCalls } = this.parseResponse(data);

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
  bindTools(tools: StructuredToolInterface[]): ChatPgptGpt {
    const params: ChatPgptGptParams = {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
      model: this.model,
      temperature: this.temperature,
    };
    if (this.customAuth) {
      params.customAuth = this.customAuth;
    }
    const newInstance = new ChatPgptGpt(params);
    newInstance.tools = tools;
    return newInstance;
  }

}
