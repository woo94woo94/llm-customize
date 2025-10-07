import { loadConfig } from "../config/index.js";
import { ChatCustomGpt } from "../clients/langchain/ChatCustomGpt.js";

async function main() {
  // 환경 변수에서 설정 로드
  const config = loadConfig();

  console.log("=== LangChain ChatModel 예제 (ChatCustomGpt) ===\n");

  // Custom GPT API를 사용하는 ChatCustomGpt 객체 생성
  const model = new ChatCustomGpt({
    ...config,
    temperature: 0.7,
  });

  // 간단한 채팅 예제
  const question =
    "안녕하세요! TypeScript와 LangGraph에 대해 간단히 설명해주세요.";

  console.log("질문:", question);
  console.log("\n응답 생성 중...\n");

  try {
    // 모델에 메시지 전송
    const response = await model.invoke(question);
    console.log("답변:", response.content);
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

// 실행
main().catch(console.error);
