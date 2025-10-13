import { loadConfig } from "../config/index.js";
import { ApiClient, type Tool } from "../clients/native/ApiClient.js";
import type { ChatMessage } from "../types/index.js";

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
  const client = new ApiClient(config);

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

    console.log("=== 1단계: API 호출 (Tools 포함) ===");
    const data = await client.chatWithTools(messages, toolSchemas);

    console.log("\n=== API 응답 분석 ===");
    console.log("응답 타입:", typeof data);
    console.log("응답 구조:", Object.keys(data || {}));
    console.log("🔍 API 응답 (Raw):", JSON.stringify(data, null, 2), "\n");

    // 2. Tool calls 확인 및 실행
    console.log("=== 2단계: Tool Calls 확인 ===");
    console.log("data.choices 존재:", !!data.choices);
    console.log("data.choices 길이:", data.choices?.length || 0);
    console.log("첫 번째 choice:", data.choices?.[0]);
    console.log("message 객체:", data.choices?.[0]?.message);
    console.log("tool_calls 존재:", !!data.choices?.[0]?.message?.tool_calls);
    console.log("tool_calls 내용:", data.choices?.[0]?.message?.tool_calls, "\n");

    if (data.choices?.[0]?.message?.tool_calls) {
      const assistantMessage = data.choices[0]?.message;
      if (!assistantMessage) {
        console.log("⚠️ assistantMessage가 없습니다");
        return;
      }

      console.log("✅ Tool calls 발견!");
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
      });

      console.log("\n=== 3단계: Tool 실행 ===");
      const toolCalls = assistantMessage.tool_calls || [];
      console.log(`실행할 Tool 개수: ${toolCalls.length}`);

      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        if (!toolCall) continue;

        console.log(`\n[Tool ${i + 1}/${toolCalls.length}]`);
        console.log(`- 이름: ${toolCall.function.name}`);
        console.log(`- 인자 (raw): ${toolCall.function.arguments}`);

        // Tool 실행
        const toolName = toolCall.function.name as keyof typeof tools;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`- 인자 (parsed):`, args);

        const result = await tools[toolName](args);
        console.log(`- 실행 결과:`, result);

        // Tool 결과를 메시지에 추가
        messages.push({
          role: "user",
          content: `${toolCall.function.name} 결과: ${result}`,
        });
      }

      console.log("\n=== 4단계: 최종 답변 요청 ===");
      console.log("메시지 히스토리:", JSON.stringify(messages, null, 2));

      const finalAnswer = await client.chat({
        messages,
        model: "gpt-4o",
        temperature: 0.7,
      });

      console.log("\n💬 최종 답변:", finalAnswer);
    } else {
      console.log("❌ Tool calls가 없습니다");
      // Tool 호출 없이 바로 답변
      const answer = data.choices?.[0]?.message?.content || "응답 없음";
      console.log("💬 직접 답변:", answer);
    }
  } catch (error) {
    console.error("\n=== 에러 발생 ===");
    console.error("에러 타입:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("에러 메시지:", error instanceof Error ? error.message : error);
    console.error("전체 에러:", error);
  }
}

main().catch(console.error);
