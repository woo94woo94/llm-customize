import { loadConfig } from "../config/index.js";
import { ChatCustomGpt } from "../clients/langchain/ChatCustomGpt.js";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

async function main() {
  // 환경 변수에서 설정 로드
  const config = loadConfig();

  console.log("=== LangGraph 기반 ChatCustomGpt 예제 ===\n");

  // Custom GPT API를 사용하는 ChatCustomGpt 객체 생성
  const model = new ChatCustomGpt({
    ...config,
    temperature: 0.7,
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
    // 첫 번째 질문
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
    // 대화 히스토리를 포함한 질문
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

}

// 실행
main().catch(console.error);
