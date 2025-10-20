import { loadConfig } from "../config/index.js";
import { ApiClient } from "../clients/native/ApiClient.js";

// 스키마 정의: 사용자 정보
const userInfoSchema = {
  name: "user_info",
  description: "사용자 정보를 구조화된 형식으로 추출",
  schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "사용자 이름",
      },
      age: {
        type: "number",
        description: "사용자 나이",
      },
      email: {
        type: "string",
        description: "이메일 주소",
      },
      interests: {
        type: "array",
        items: {
          type: "string",
        },
        description: "관심사 목록",
      },
    },
    required: ["name", "age", "email", "interests"],
    additionalProperties: false,
  },
};

// 스키마 정의: 이벤트 정보
const eventInfoSchema = {
  name: "event_info",
  description: "이벤트 정보를 구조화된 형식으로 추출",
  schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "이벤트 제목",
      },
      date: {
        type: "string",
        description: "이벤트 날짜 (YYYY-MM-DD 형식)",
      },
      location: {
        type: "string",
        description: "이벤트 장소",
      },
      participants: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            role: {
              type: "string",
            },
          },
          required: ["name", "role"],
          additionalProperties: false,
        },
        description: "참가자 목록",
      },
      budget: {
        type: "number",
        description: "예산 (원)",
      },
    },
    required: ["title", "date", "location", "participants", "budget"],
    additionalProperties: false,
  },
};

// TypeScript 타입 정의
interface UserInfo {
  name: string;
  age: number;
  email: string;
  interests: string[];
}

interface EventInfo {
  title: string;
  date: string;
  location: string;
  participants: Array<{
    name: string;
    role: string;
  }>;
  budget: number;
}

async function main() {
  const config = loadConfig();
  const client = new ApiClient(config);

  console.log("=== Native API + Structured Output 테스트 ===\n");

  // 예제 1: 사용자 정보 생성
  console.log("📝 예제 1: 사용자 정보 생성\n");
  try {
    const userInfo = await client.chatWithStructuredOutput<UserInfo>(
      [
        {
          role: "user",
          content:
            "25살 김철수에 대한 사용자 정보를 만들어줘. 이메일은 chulsoo@example.com이고, 축구, 영화, 프로그래밍에 관심이 있어.",
        },
      ],
      userInfoSchema,
      {
        model: "gpt-4o",
        temperature: 0.7,
      }
    );

    console.log("✅ 생성된 사용자 정보:");
    console.log(JSON.stringify(userInfo, null, 2));
    console.log("\n타입 확인:");
    console.log(`- name: ${userInfo.name} (${typeof userInfo.name})`);
    console.log(`- age: ${userInfo.age} (${typeof userInfo.age})`);
    console.log(`- email: ${userInfo.email} (${typeof userInfo.email})`);
    console.log(`- interests: [${userInfo.interests.join(", ")}] (배열 길이: ${userInfo.interests.length})`);
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 예제 2: 이벤트 정보 추출
  console.log("📝 예제 2: 이벤트 정보 추출\n");
  try {
    const eventInfo = await client.chatWithStructuredOutput<EventInfo>(
      [
        {
          role: "user",
          content: `다음 텍스트에서 이벤트 정보를 추출해줘:

"2025년 3월 15일에 서울 코엑스에서 개발자 컨퍼런스를 개최합니다.
발표자는 김철수(메인 스피커)와 이영희(패널)입니다.
예산은 5백만원입니다."`,
        },
      ],
      eventInfoSchema,
      {
        model: "gpt-4o",
        temperature: 0.3,
      }
    );

    console.log("✅ 추출된 이벤트 정보:");
    console.log(JSON.stringify(eventInfo, null, 2));
    console.log("\n상세 정보:");
    console.log(`- 제목: ${eventInfo.title}`);
    console.log(`- 날짜: ${eventInfo.date}`);
    console.log(`- 장소: ${eventInfo.location}`);
    console.log(`- 참가자 수: ${eventInfo.participants.length}명`);
    eventInfo.participants.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.role})`);
    });
    console.log(`- 예산: ${eventInfo.budget.toLocaleString()}원`);
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 예제 3: 잘못된 입력 처리
  console.log("📝 예제 3: 타입 안정성 확인\n");
  try {
    const userInfo2 = await client.chatWithStructuredOutput<UserInfo>(
      [
        {
          role: "user",
          content: "30살 개발자 박지민의 정보를 만들어줘. 이메일은 jimin@dev.com",
        },
      ],
      userInfoSchema,
      {
        model: "gpt-4o",
        temperature: 0.5,
      }
    );

    console.log("✅ 생성된 사용자 정보:");
    console.log(JSON.stringify(userInfo2, null, 2));

    // 타입 안정성: TypeScript가 자동완성과 타입 체크 제공
    console.log(`\n이름: ${userInfo2.name}`);
    console.log(`나이: ${userInfo2.age}살`);
    console.log(`첫 번째 관심사: ${userInfo2.interests[0]}`);
  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }
}

main().catch(console.error);
