import { loadConfig } from "../config/index.js";
import type { ChatMessage, GptResponse } from "../types/index.js";

// Tool 정의
interface Tool {
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

// Tool 실행 함수
const tools = {
  get_weather: async (args: { location: string }) => {
    const mockWeather: Record<string, string> = {
      서울: "맑음, 15°C",
      부산: "흐림, 18°C",
      제주: "비, 20°C",
    };
    return mockWeather[args.location] || "정보 없음";
  },
  calculator: async (args: { expression: string }) => {
    try {
      const result = eval(args.expression);
      return `${args.expression} = ${result}`;
    } catch (error) {
      return `계산 오류: ${error}`;
    }
  },
};

// Tool 스키마
const toolSchemas: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "특정 지역의 날씨 정보를 조회합니다",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "날씨를 조회할 지역명",
          },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculator",
      description: "수학 계산을 수행합니다",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "계산할 수식 (예: 2 + 2)",
          },
        },
        required: ["expression"],
      },
    },
  },
];

async function main() {
  const config = loadConfig();

  console.log("=== Native API + Tools 테스트 ===\n");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: "서울 날씨 어때? 그리고 25 곱하기 4는 얼마야?",
    },
  ];

  try {
    // 1. Tool을 포함한 첫 번째 요청
    console.log("📝 사용자 질문:", messages[0]?.content, "\n");

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: config.customAuth
          ? `Bearer ${Buffer.from(
              JSON.stringify({
                apiKey: config.apiKey,
                systemCode: config.customAuth.systemCode,
                companyCode: config.customAuth.companyCode,
              })
            ).toString("base64")}`
          : `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messages,
        model: "gpt-4o",
        temperature: 0.7,
        tools: toolSchemas,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = (await response.json()) as GptResponse;

    // 2. Tool calls 확인 및 실행
    if (data.choices?.[0]?.message?.tool_calls) {
      const assistantMessage = data.choices[0]?.message;
      if (!assistantMessage) return;
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
      });

      console.log("🔧 AI가 요청한 Tool calls:");
      const toolCalls = assistantMessage.tool_calls || [];
      for (const toolCall of toolCalls) {
        console.log(`- ${toolCall.function.name}:`, toolCall.function.arguments);

        // Tool 실행
        const toolName = toolCall.function.name as keyof typeof tools;
        const args = JSON.parse(toolCall.function.arguments);
        const result = await tools[toolName](args);

        console.log(`  결과:`, result);

        // Tool 결과를 메시지에 추가
        messages.push({
          role: "user",
          content: `${toolCall.function.name} 결과: ${result}`,
        });
      }

      console.log("\n");

      // 3. Tool 결과를 포함한 두 번째 요청
      const finalResponse = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: config.customAuth
            ? `Bearer ${Buffer.from(
                JSON.stringify({
                  apiKey: config.apiKey,
                  systemCode: config.customAuth.systemCode,
                  companyCode: config.customAuth.companyCode,
                })
              ).toString("base64")}`
            : `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          messages,
          model: "gpt-4o",
          temperature: 0.7,
        }),
      });

      const finalData = (await finalResponse.json()) as GptResponse;
      const finalAnswer = finalData.choices?.[0]?.message?.content || "응답 없음";

      console.log("💬 최종 답변:", finalAnswer);
    } else {
      // Tool 호출 없이 바로 답변
      const answer = data.choices?.[0]?.message?.content || "응답 없음";
      console.log("💬 답변:", answer);
    }
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

main().catch(console.error);
