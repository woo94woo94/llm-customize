import { AIMessage, BaseMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import {
  BaseChatModel,
  type BaseChatModelCallOptions,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import type { PgptClientConfig, PgptAnthropicResponse } from "../../types/index.js";
import type { StructuredToolInterface } from "@langchain/core/tools";

interface ChatPgptClaudeOptions extends BaseChatModelCallOptions {}

interface ChatPgptClaudeParams extends BaseChatModelParams, PgptClientConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * LangChain 호환 PGPT 프록시 채팅 모델 (Claude 전용)
 *
 * @example
 * ```typescript
 * import { loadPgptConfig } from "../../config/index.js";
 *
 * const config = loadPgptConfig();
 * const model = new ChatPgptClaude({
 *   ...config,
 *   model: "claude-sonnet-4-5-20250929",
 *   temperature: 0.7,
 * });
 *
 * const response = await model.invoke("안녕하세요");
 * console.log(response.content);
 * ```
 */
export class ChatPgptClaude extends BaseChatModel<ChatPgptClaudeOptions> {
  apiKey: string;
  apiUrl: string;
  customAuth?: {
    systemCode: string;
    companyCode: string;
  };
  model: string;
  temperature: number;
  max_tokens: number;
  tools?: StructuredToolInterface[];
  private anthropicVersion = "2023-06-01";

  static lc_name(): string {
    return "ChatPgptClaude";
  }

  constructor(fields: ChatPgptClaudeParams) {
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
    this.model = fields.model || "claude-sonnet-4-5-20250929";
    this.temperature = fields.temperature ?? 0.7;
    this.max_tokens = fields.max_tokens || 4096;
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
   * LangChain 메시지를 Claude API 형식으로 변환
   */
  private formatMessages(
    messages: BaseMessage[]
  ): { system?: string; messages: Array<{ role: string; content: any }> } {
    let systemPrompt: string | undefined;
    const formattedMessages: Array<{ role: string; content: any }> = [];

    for (const msg of messages) {
      // System 메시지는 별도로 처리
      if (msg instanceof SystemMessage) {
        systemPrompt = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        continue;
      }

      let role = "user";
      if (msg instanceof AIMessage) {
        role = "assistant";
      }

      // ToolMessage 처리
      if (msg instanceof ToolMessage) {
        const content: any[] = [];

        if (this.customAuth) {
          // customAuth: 일반 텍스트로 변환
          const toolName = (msg as any).name || "tool";
          const toolContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
          formattedMessages.push({
            role: "user",
            content: `${toolName} 결과: ${toolContent}`,
          });
        } else {
          // 표준 API: tool_result 형식
          content.push({
            type: "tool_result",
            tool_use_id: (msg as any).tool_call_id,
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
          });
          formattedMessages.push({
            role: "user",
            content,
          });
        }
        continue;
      }

      // AIMessage의 tool_calls 처리
      if (msg instanceof AIMessage && "tool_calls" in msg && Array.isArray((msg as any).tool_calls) && (msg as any).tool_calls.length > 0) {
        const content: any[] = [];

        // 텍스트 content가 있으면 추가
        if (msg.content && typeof msg.content === "string") {
          content.push({ type: "text", text: msg.content });
        }

        if (!this.customAuth) {
          // 표준 API: tool_use 형식
          for (const tc of (msg as any).tool_calls) {
            content.push({
              type: "tool_use",
              id: tc.id,
              name: tc.name,
              input: tc.args,
            });
          }
        }

        formattedMessages.push({
          role: "assistant",
          content: content.length > 0 ? content : [{ type: "text", text: "" }],
        });
        continue;
      }

      // 일반 메시지
      const textContent = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      formattedMessages.push({
        role,
        content: textContent,
      });
    }

    const result: { system?: string; messages: Array<{ role: string; content: any }> } = {
      messages: formattedMessages,
    };
    if (systemPrompt) {
      result.system = systemPrompt;
    }
    return result;
  }

  /**
   * 응답에서 content와 tool_uses 추출
   */
  private parseResponse(data: PgptAnthropicResponse): { content: string; toolCalls: any[] } {
    let content = "";
    let toolCalls: any[] = [];

    // content 배열에서 텍스트와 tool_use 추출
    for (const block of data.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          name: block.name,
          args: block.input,
          id: block.id,
          type: "tool_call",
        });
      }
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

    const { system, messages: formattedMessages } = this.formatMessages(messages);

    const requestBody: any = {
      model: this.model,
      messages: formattedMessages,
      max_tokens: this.max_tokens,
      temperature: this.temperature,
      ...(system && { system }),
    };

    if (this.customAuth) {
      requestBody.need_origin = true;
    }

    if (this.tools && this.tools.length > 0 && !this.customAuth) {
      requestBody.tools = this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.schema,
      }));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": this.anthropicVersion,
    };

    // customAuth 사용 시 Authorization, 아니면 x-api-key
    if (this.customAuth) {
      headers["Authorization"] = this.createAuthHeader();
    } else {
      headers["x-api-key"] = this.apiKey;
    }

    try {
      // URL 끝에 /messages 추가 (Claude API 엔드포인트)
      const url = this.apiUrl.endsWith("/messages")
        ? this.apiUrl
        : `${this.apiUrl}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      let data: PgptAnthropicResponse;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Failed to parse Claude API response: ${responseText}`);
      }

      const { content, toolCalls } = this.parseResponse(data);

      const message = new AIMessage({
        content,
        tool_calls: toolCalls,
      });

      return {
        generations: [{ message, text: content }],
        llmOutput: { stop_reason: data.stop_reason },
      };
    } catch (error) {
      throw new Error(`Failed to call Claude API: ${error}`);
    }
  }

  _llmType(): string {
    return "claude";
  }

  /**
   * Tool을 모델에 바인딩
   */
  bindTools(tools: StructuredToolInterface[]): ChatPgptClaude {
    const params: ChatPgptClaudeParams = {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.max_tokens,
    };
    if (this.customAuth) {
      params.customAuth = this.customAuth;
    }
    const newInstance = new ChatPgptClaude(params);
    newInstance.tools = tools;
    return newInstance;
  }

}
