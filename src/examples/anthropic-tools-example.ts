import { loadPgptConfig } from "../config/index.js";
import { ClaudeClient, type ClaudeTool } from "../clients/native/ClaudeClient.js";
import type { AnthropicMessage } from "../types/index.js";

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

// Tool 스키마 (Anthropic 형식)
const toolSchemas: ClaudeTool[] = [
  {
    name: "get_weather",
    description: "특정 지역의 날씨 정보를 조회합니다",
    input_schema: {
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
  {
    name: "calculator",
    description: "수학 계산을 수행합니다",
    input_schema: {
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
];

async function main() {
  const config = loadPgptConfig();
  const client = new ClaudeClient(config);

  console.log("=== Anthropic API + Tools 테스트 ===\n");

  const messages: AnthropicMessage[] = [
    {
      role: "user",
      content: "서울 날씨 어때? 그리고 25 곱하기 4는 얼마야?",
    },
  ];

  try {
    // 1. Tool을 포함한 첫 번째 요청
    console.log("📝 사용자 질문:", messages[0]?.content, "\n");

    console.log("=== 1단계: API 호출 (Tools 포함) ===");
    const data = await client.chatWithTools({
      messages,
      tools: toolSchemas,
    });

    console.log("\n=== API 응답 분석 ===");
    console.log("Stop reason:", data.stop_reason);
    console.log("Content 개수:", data.content.length);
    console.log("Content types:", data.content.map((c) => c.type).join(", "));

    // 2. Tool calls 확인 및 실행
    console.log("\n=== 2단계: Tool Calls 확인 ===");
    const toolUses = data.content.filter((c) => c.type === "tool_use");

    if (toolUses.length > 0) {
      console.log(`✅ Tool uses 발견! (${toolUses.length}개)`);

      // Assistant 메시지 추가
      messages.push({
        role: "assistant",
        content: data.content,
      });

      console.log("\n=== 3단계: Tool 실행 ===");
      const toolResults = [];

      for (let i = 0; i < toolUses.length; i++) {
        const toolUse = toolUses[i];
        if (!toolUse || !toolUse.name || !toolUse.id) continue;

        console.log(`\n[Tool ${i + 1}/${toolUses.length}]`);
        console.log(`- 이름: ${toolUse.name}`);
        console.log(`- ID: ${toolUse.id}`);
        console.log(`- 인자:`, toolUse.input);

        // Tool 실행
        const toolName = toolUse.name as keyof typeof tools;
        const result = await tools[toolName](toolUse.input);
        console.log(`- 실행 결과:`, result);

        // Tool 결과 저장
        toolResults.push({
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Tool 결과를 메시지에 추가
      messages.push({
        role: "user",
        content: toolResults,
      });

      console.log("\n=== 4단계: 최종 답변 요청 ===");
      console.log("메시지 히스토리:", JSON.stringify(messages, null, 2));

      const finalResponse = await client.chat({
        messages,
      });

      console.log("\n💬 최종 답변:", finalResponse);
    } else {
      console.log("❌ Tool uses가 없습니다");
      // Tool 호출 없이 바로 답변
      const textContent = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
      console.log("💬 직접 답변:", textContent);
    }
  } catch (error) {
    console.error("\n=== 에러 발생 ===");
    console.error("에러 타입:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("에러 메시지:", error instanceof Error ? error.message : error);
    console.error("전체 에러:", error);
  }
}

main().catch(console.error);
