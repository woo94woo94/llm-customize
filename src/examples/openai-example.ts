import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { loadConfig } from "../config/index.js";

async function main() {
  // 환경 변수에서 설정 로드
  const config = loadConfig();

  console.log("=== LangGraph + ChatOpenAI 예제 ===\n");

  // apiUrl에서 baseURL 추출 (https://api.openai.com/v1/chat/completions -> https://api.openai.com/v1)
  const baseURL = config.apiUrl.replace(/\/chat\/completions$/, "");

  // ChatOpenAI 모델 생성
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: "gpt-4o",
    temperature: 0.7,
    configuration: {
      baseURL,
    },
  });

  // LangGraph StateGraph 정의
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      // LLM 호출
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    })
    .addEdge("__start__", "agent")
    .addEdge("agent", "__end__");

  // 그래프 컴파일
  const app = workflow.compile();

  console.log("📝 예제 1: 간단한 질문\n");

  try {
    const result1 = await app.invoke({
      messages: [
        new HumanMessage("TypeScript란 무엇인가요? 간단히 설명해주세요."),
      ],
    });

    const lastMessage1 = result1.messages[result1.messages.length - 1];
    console.log("답변:", lastMessage1?.content || "응답 없음");
  } catch (error) {
    console.error("에러 발생:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("📝 예제 2: 대화 히스토리 유지\n");

  try {
    const result2 = await app.invoke({
      messages: [
        new HumanMessage("Python이란?"),
        new AIMessage("Python은 간결하고 읽기 쉬운 프로그래밍 언어입니다."),
        new HumanMessage("그럼 TypeScript는?"),
      ],
    });

    const lastMessage2 = result2.messages[result2.messages.length - 1];
    console.log("답변:", lastMessage2?.content || "응답 없음");
  } catch (error) {
    console.error("에러 발생:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("📝 예제 3: 토큰 단위 스트리밍 (model.stream)\n");

  try {
    process.stdout.write("답변: ");

    const stream = await model.stream([
      new HumanMessage("LangGraph에 대해 간단히 설명해주세요."),
    ]);

    for await (const chunk of stream) {
      if (typeof chunk.content === "string") {
        process.stdout.write(chunk.content);
      }
    }

    console.log("\n");
  } catch (error) {
    console.error("에러 발생:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  console.log("📝 예제 4: LangGraph에서 스트리밍\n");

  try {
    process.stdout.write("답변: ");

    const eventStream = app.streamEvents(
      {
        messages: [new HumanMessage("TypeScript의 장점을 3가지만 말해줘.")],
      },
      { version: "v2" }
    );

    for await (const event of eventStream) {
      if (event.event === "on_chat_model_stream") {
        const chunk = event.data?.chunk;
        if (chunk?.content && typeof chunk.content === "string") {
          process.stdout.write(chunk.content);
        }
      }
    }

    console.log("\n");
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

// 실행
main().catch(console.error);
