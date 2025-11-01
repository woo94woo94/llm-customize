import { loadPgptConfig } from "../config/index.js";
import { GptClient } from "../clients/native/GptClient.js";

async function main() {
  // 환경 변수에서 설정 로드
  const config = loadPgptConfig();

  // GPT API 클라이언트 생성
  const client = new GptClient(config);

  console.log("=== GPT API 직접 호출 예제 ===\n");

  // 예제 1: 간단한 질문
  console.log("📝 예제 1: 간단한 질문");
  console.log("질문: TypeScript란 무엇인가요?");
  console.log("\n응답 생성 중...\n");

  try {
    const answer1 = await client.chat({
      messages: [{ role: "user", content: "TypeScript란 무엇인가요?" }],
    });
    console.log("답변:", answer1);
  } catch (error) {
    console.error("에러 발생:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // 예제 2: 시스템 프롬프트 포함
  console.log("📝 예제 2: 시스템 프롬프트 포함");
  console.log("질문: LangGraph에 대해 설명해주세요.");
  console.log("\n응답 생성 중...\n");

  try {
    const answer2 = await client.chat({
      messages: [
        {
          role: "system",
          content: "당신은 프로그래밍 전문가입니다. 간단명료하게 설명해주세요.",
        },
        { role: "user", content: "LangGraph에 대해 설명해주세요." },
      ],
    });
    console.log("답변:", answer2);
  } catch (error) {
    console.error("에러 발생:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // 예제 3: 대화 히스토리 포함
  console.log("📝 예제 3: 대화 히스토리 포함");
  console.log("\n응답 생성 중...\n");

  try {
    const answer3 = await client.chat({
      messages: [
        { role: "system", content: "당신은 친절한 AI 어시스턴트입니다." },
        { role: "user", content: "Python이 뭐야?" },
        {
          role: "assistant",
          content: "Python은 인기있는 프로그래밍 언어입니다.",
        },
        { role: "user", content: "그럼 Node.js는?" },
      ],
      temperature: 0.7,
    });
    console.log("답변:", answer3);
  } catch (error) {
    console.error("에러 발생:", error);
  }

}

// 실행
main().catch(console.error);
