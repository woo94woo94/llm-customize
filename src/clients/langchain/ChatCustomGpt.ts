import { AIMessage, BaseMessage } from "@langchain/core/messages";
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
  ): Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: any[] }> {
    console.log("\n=== formatMessages 시작 ===");
    console.log(`customAuth 사용: ${!!this.customAuth}`);
    console.log(`총 메시지 개수: ${messages.length}`);

    const formatted = messages.map((msg, index) => {
      const msgType = msg._getType();
      let role = "user";

      if (msgType === "system") {
        role = "system";
      } else if (msgType === "ai") {
        role = "assistant";
      } else if (msgType === "tool") {
        // customAuth 사용 시 tool을 user로 변환 (서버가 role: "tool" 지원하지 않을 수 있음)
        role = this.customAuth ? "user" : "tool";
      }

      let content: string | null =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);

      // customAuth 사용 시 ToolMessage를 user로 변환하면서 tool 이름 포함
      if (msgType === "tool" && this.customAuth && "name" in msg) {
        const toolName = (msg as any).name;
        content = `${toolName} 결과: ${content}`;
        console.log(`  customAuth: tool 이름 포함 - ${toolName}`);
      }

      const result: { role: string; content: string | null; tool_call_id?: string; tool_calls?: any[] } = {
        role,
        content,
      };

      console.log(`\n[메시지 ${index + 1}]`);
      console.log(`  원본 타입: ${msgType}`);
      console.log(`  변환된 role: ${role}`);
      console.log(`  content 길이: ${content?.length || 0}`);

      // ToolMessage인 경우 tool_call_id 추가 (customAuth가 아닐 때만)
      if (msgType === "tool" && "tool_call_id" in msg && !this.customAuth) {
        result.tool_call_id = (msg as any).tool_call_id;
        console.log(`  tool_call_id: ${result.tool_call_id}`);
      }

      // AI 메시지에 tool_calls가 있는 경우 추가 (customAuth가 아닐 때만)
      if (msgType === "ai" && "tool_calls" in msg && Array.isArray((msg as any).tool_calls) && (msg as any).tool_calls.length > 0) {
        if (!this.customAuth) {
          // 표준 OpenAI API는 tool_calls 포함
          result.tool_calls = (msg as any).tool_calls.map((tc: any) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args),
            },
          }));
          console.log(`  tool_calls 개수: ${result.tool_calls?.length || 0}`);
        } else {
          // customAuth는 tool_calls 제거 (서버가 지원하지 않음)
          console.log(`  customAuth: tool_calls 제거 (서버 미지원)`);
        }

        // tool_calls가 있고 content가 빈 문자열이면 null로 설정
        if (!result.content || result.content === "") {
          result.content = null;
          console.log(`  content를 null로 설정`);
        }
      }

      return result;
    });

    console.log("\n=== formatMessages 완료 ===\n");
    return formatted;
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

    // customAuth 사용 시에만 need_origin 추가
    if (this.customAuth) {
      requestBody.need_origin = true;
    }

    console.log("\n=== 최종 전송 메시지 ===");
    console.log(`customAuth: ${!!this.customAuth}`);
    console.log(`tools 포함: ${!!(this.tools && this.tools.length > 0)}`);
    console.log("전송될 messages:");
    formattedMessages.forEach((msg, index) => {
      console.log(`\n[${index + 1}] ${msg.role}`);
      console.log(`  content: ${msg.content ? (msg.content.length > 50 ? msg.content.substring(0, 50) + "..." : msg.content) : "null"}`);
      if (msg.tool_call_id) {
        console.log(`  tool_call_id: ${msg.tool_call_id}`);
      }
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        console.log(`  tool_calls: ${msg.tool_calls.length}개`);
        msg.tool_calls.forEach((tc: any, i: number) => {
          console.log(`    [${i + 1}] ${tc.function.name}`);
        });
      }
    });
    console.log("\n========================\n");

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
      console.log("=== Request to GPT API ===");
      console.log("URL:", this.apiUrl);
      console.log("Request Body:", JSON.stringify(requestBody, null, 2));
      console.log("==========================\n");

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.createAuthHeader(),
        },
        body: JSON.stringify(requestBody),
      });

      console.log("=== Response Status ===");
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));
      console.log("======================\n");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPT API error (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      console.log("=== Raw Response Body ===");
      console.log(responseText);
      console.log("=========================\n");

      let content = "";
      let toolCalls: any[] = [];

      // customAuth 사용 시에도 JSON 파싱 시도
      if (this.customAuth) {
        console.log("📝 customAuth detected, attempting JSON parse");
        try {
          const data = JSON.parse(responseText) as GptResponse;
          console.log("✅ JSON 파싱 성공");

          // tool_calls 추출
          if (data.choices && data.choices.length > 0) {
            const firstChoice = data.choices[0];
            if (firstChoice && firstChoice.message?.content) {
              content = firstChoice.message.content;
            }
            if (firstChoice && firstChoice.message?.tool_calls) {
              toolCalls = firstChoice.message.tool_calls.map((tc: any) => ({
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments),
                id: tc.id,
                type: "tool_call",
              }));
            }
          }

          // content가 없는 경우 다른 필드에서 추출
          if (!content && data.response) {
            content = data.response;
          } else if (!content && data.answer) {
            content = data.answer;
          } else if (!content && data.result) {
            content = data.result;
          }
        } catch (parseError) {
          console.log("⚠️ JSON 파싱 실패, raw text 사용");
          content = responseText;
        }
      } else {
        // 표준 OpenAI API는 항상 JSON
        let data: GptResponse;
        try {
          data = JSON.parse(responseText) as GptResponse;
        } catch (parseError) {
          console.error("=== JSON Parse Error ===");
          console.error("Error:", parseError);
          console.error("Response was:", responseText.substring(0, 200));
          console.error("========================\n");
          throw new Error(`Failed to parse JSON response: ${parseError}`);
        }

        if (data.choices && data.choices.length > 0) {
          const firstChoice = data.choices[0];
          if (firstChoice && firstChoice.message?.content) {
            content = firstChoice.message.content;
          }
          if (firstChoice && firstChoice.message?.tool_calls) {
            toolCalls = firstChoice.message.tool_calls.map((tc: any) => ({
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments),
              id: tc.id,
              type: "tool_call",
            }));
          }
        }

        // content가 없는 경우 다른 필드에서 추출 (tool_calls가 없을 때만)
        if (!content && toolCalls.length === 0) {
          if (data.response) {
            content = data.response;
          } else if (data.answer) {
            content = data.answer;
          } else if (data.result) {
            content = data.result;
          } else {
            content = JSON.stringify(data);
          }
        }
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
    };
    if (this.customAuth) {
      params.customAuth = this.customAuth;
    }
    const newInstance = new ChatCustomGpt(params);
    newInstance.tools = tools;
    return newInstance;
  }

}
