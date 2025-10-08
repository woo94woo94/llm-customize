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
    if (
      lastMessage &&
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      return "tools";
    }
    return "__end__";
  };

  // 모델 호출 노드
  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const response = await modelWithTools.invoke(messages);
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
    const stream = await app.stream(
      {
        messages: [
          new HumanMessage(
            "get_weather 툴을 사용해서 서울 날씨를 알려주고, calculator 툴을 사용해서 25*4를 계산해줘"
          ),
        ],
      },
      { streamMode: "values" }
    );

    for await (const chunk of stream) {
      const lastMessage = chunk.messages[chunk.messages.length - 1];
      if (!lastMessage) continue;

      const type = lastMessage._getType();
      const content = lastMessage.content;
      const toolCalls = (lastMessage as any).tool_calls;

      console.log({
        type,
        content: typeof content === "string" ? content : JSON.stringify(content),
        toolCalls: toolCalls || "없음",
      });
      console.log("-----\n");
    }
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

main().catch(console.error);
