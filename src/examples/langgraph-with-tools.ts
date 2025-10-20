import { loadConfig } from "../config/index.js";
import { ChatCustomGpt } from "../clients/langchain/ChatCustomGpt.js";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 간단한 날씨 조회 tool 정의
const weatherTool = tool(
  async ({ location }) => {
    // 실제로는 날씨 API를 호출하지만, 여기서는 mock 데이터 반환
    const mockWeather: Record<string, string> = {
      서울: "맑음, 15°C",
      부산: "흐림, 18°C",
      제주: "비, 20°C",
    };
    return mockWeather[location] || "정보 없음";
  },
  {
    name: "get_weather",
    description: "특정 지역의 날씨 정보를 조회합니다",
    schema: z.object({
      location: z.string().describe("날씨를 조회할 지역명"),
    }),
  }
);

// 계산기 tool 정의
const calculatorTool = tool(
  async ({ expression }) => {
    try {
      // 간단한 수식 계산 (위험: eval 사용, 실제로는 안전한 파서 사용 권장)
      const result = eval(expression);
      return `${expression} = ${result}`;
    } catch (error) {
      return `계산 오류: ${error}`;
    }
  },
  {
    name: "calculator",
    description: "수학 계산을 수행합니다",
    schema: z.object({
      expression: z.string().describe("계산할 수식 (예: 2 + 2)"),
    }),
  }
);

async function main() {
  const config = loadConfig();

  console.log("=== LangGraph + Tools 테스트 ===\n");

  // tools 배열
  const tools = [weatherTool, calculatorTool];

  // ChatCustomGpt 모델 생성 및 tools 바인딩
  const model = new ChatCustomGpt({
    ...config,
    temperature: 0.7,
  });

  const modelWithTools = model.bindTools(tools);

  // ToolNode 생성
  const toolNode = new ToolNode(tools);

  // 조건부 엣지: tool 호출이 있으면 tools 노드로, 없으면 종료
  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    console.log("\n🔍 shouldContinue 체크:");
    console.log(`- 마지막 메시지 타입: ${lastMessage?._getType()}`);
    console.log(`- tool_calls 존재: ${lastMessage ? "tool_calls" in lastMessage : false}`);
    console.log(`- tool_calls 배열: ${lastMessage ? Array.isArray((lastMessage as any).tool_calls) : false}`);
    console.log(`- tool_calls 개수: ${(lastMessage as any)?.tool_calls?.length || 0}`);

    if (
      lastMessage &&
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      console.log("➡️ tools 노드로 이동\n");
      return "tools";
    }
    console.log("➡️ 종료\n");
    return "__end__";
  };

  // 모델 호출 노드
  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    console.log("\n🤖 Agent 노드 호출:");
    console.log(`- 현재 메시지 개수: ${messages.length}`);
    const response = await modelWithTools.invoke(messages);
    console.log(`- AI 응답: ${response.content || "(tool 호출)"}`);
    if ((response as any).tool_calls?.length > 0) {
      console.log(`- Tool 호출 개수: ${(response as any).tool_calls.length}`);
    }
    return { messages: [response] };
  };

  // StateGraph 정의
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      __end__: "__end__",
    })
    .addEdge("tools", "agent");

  const app = workflow.compile();

  console.log("📝 테스트: Tool을 사용하는 Agent\n");
  console.log("사용 가능한 tools:");
  tools.forEach((tool) => {
    console.log(`- ${tool.name}: ${tool.description}`);
  });
  console.log("\n");

  try {
    console.log("💬 사용자 질문: 서울 날씨를 알려주고, 25*4를 계산해줘\n");

    const result = await app.invoke(
      {
        messages: [
          new HumanMessage(
            "서울 날씨를 알려주고, 25*4를 계산해줘"
          ),
        ],
      },
      {
        recursionLimit: 10,
      }
    );

    console.log("\n=== 실행 결과 ===");
    console.log(`총 메시지 개수: ${result.messages.length}\n`);

    // 모든 메시지 출력
    result.messages.forEach((msg: any, index: number) => {
      const type = msg._getType();
      console.log(`[${index + 1}] ${type.toUpperCase()}`);

      if (type === "human") {
        console.log(`내용: ${msg.content}\n`);
      } else if (type === "ai") {
        console.log(`내용: ${msg.content || "(tool 호출)"}`);
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          console.log(`Tool 호출:`);
          msg.tool_calls.forEach((tc: any) => {
            console.log(`  - ${tc.name}(${JSON.stringify(tc.args)})`);
          });
        }
        console.log();
      } else if (type === "tool") {
        console.log(`Tool: ${msg.name}`);
        console.log(`결과: ${msg.content}\n`);
      }
    });

    // 최종 답변 출력
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage && lastMessage._getType() === "ai") {
      console.log("=".repeat(50));
      console.log("✅ 최종 답변:");
      console.log(lastMessage.content);
      console.log("=".repeat(50));
    }
  } catch (error) {
    console.error("\n=== 에러 발생 ===");
    console.error("에러:", error);
  }
}

main().catch(console.error);
