# Custom GPT API 연동 가이드

## 개요
Custom GPT API를 LangChain/LangGraph와 연동하기 위한 커스텀 ChatModel 구현

## API 정보

### 엔드포인트
```
환경변수 GPT_API_URL에 설정된 값 사용
```

### 인증 방식
Authorization 헤더에 JSON을 Base64로 인코딩한 Bearer 토큰 전달

```json
{
  "apiKey": "환경변수 GPT_API_KEY",
  "systemCode": "환경변수 GPT_SYSTEM_CODE",
  "companyCode": "환경변수 GPT_COMPANY_CODE"
}
```

Base64 인코딩은 코드에서 자동으로 처리됩니다.

### 요청 형식 (Body)

```json
{
  "messages": [
    {
      "role": "system",
      "content": "다음 내용을 보고 질문에 답을 해주세요."
    },
    {
      "role": "user",
      "content": "내용: 있음 질문: 안녕하세요"
    }
  ],
  "model": "gpt-4o",
  "temperature": 0.7,
  "topK": 5
}
```

### 응답 형식

OpenAI 호환 형식 또는 커스텀 형식:
```json
{
  "choices": [
    {
      "message": {
        "content": "응답 내용"
      }
    }
  ]
}
```

또는:
```json
{
  "response": "응답 내용",
  "answer": "응답 내용",
  "result": "응답 내용"
}
```

## 환경 변수 설정

`.env` 파일을 생성하고 실제 값을 입력하세요 (`.env.example` 참고):
```env
GPT_API_KEY=your-api-key-here
GPT_SYSTEM_CODE=your-system-code
GPT_COMPANY_CODE=your-company-code
GPT_API_URL=http://your-api-endpoint/path
```

## 구현

### 1. ChatCustomGpt 클래스 (`src/clients/langchain/ChatCustomGpt.ts`)

`BaseChatModel`을 상속받아 Custom GPT API와 통신:

```typescript
import { loadConfig } from "./config/index.js";
import { ChatCustomGpt } from "./clients/langchain/ChatCustomGpt.js";

const config = loadConfig();
const model = new ChatCustomGpt({
  ...config,
  temperature: 0.7,
});
```

### 2. 사용 예제

#### 간단한 채팅
```typescript
const response = await model.invoke("안녕하세요!");
console.log(response.content);
```

#### 메시지 히스토리와 함께
```typescript
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const messages = [
  new SystemMessage("당신은 친절한 AI 어시스턴트입니다."),
  new HumanMessage("TypeScript에 대해 설명해주세요."),
];

const response = await model.invoke(messages);
console.log(response.content);
```

#### LangGraph에서 사용
```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { loadConfig } from "./config/index.js";
import { ChatCustomGpt } from "./clients/langchain/ChatCustomGpt.js";

const config = loadConfig();
const model = new ChatCustomGpt(config);

// LangGraph 노드에서 사용
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .compile();

const result = await graph.invoke({
  messages: [{ role: "user", content: "안녕하세요!" }],
});
```

## 주요 특징

### LangChain 표준 인터페이스 지원
- `.invoke()` - 단일 호출
- `.stream()` - 스트리밍 응답
- `.batch()` - 배치 처리
- 모든 LangChain 체인 및 에이전트와 호환

### 자동 메시지 변환
- LangChain 메시지 타입 → API 형식 자동 변환
- `HumanMessage` → `{role: "user"}`
- `AIMessage` → `{role: "assistant"}`
- `SystemMessage` → `{role: "system"}`

### 유연한 응답 파싱
- OpenAI 형식 (`choices`)
- 커스텀 형식 (`response`, `answer`, `result`)
- 모든 형식 자동 지원

## 설정 옵션

### 필수 환경변수
- `GPT_API_KEY`: API 키
- `GPT_SYSTEM_CODE`: 시스템 코드
- `GPT_COMPANY_CODE`: 회사 코드
- `GPT_API_URL`: API URL

### 선택 환경변수
- `GPT_MODEL`: 모델 이름 (기본값: "gpt-4o")
- `GPT_TEMPERATURE`: 온도 (기본값: 0.7)
- `GPT_TOP_K`: RAG 검색 수 (기본값: 5)

## 참고 사항

### OpenAI API와의 차이점
1. **인증 방식**: API Key가 아닌 JSON Base64 Bearer 토큰
2. **요청 형식**: `topK` 파라미터 추가
3. **엔드포인트**: OpenAI와 다른 단일 엔드포인트

### 제한사항
- 스트리밍(`stream()`)은 API 지원 여부에 따라 다름
- 함수 호출(Function Calling)은 별도 구현 필요
- 멀티모달(이미지 등)은 지원하지 않음

## 트러블슈팅

### 401 Unauthorized
- API Key, systemCode, companyCode 확인
- Base64 인코딩 확인

### 응답이 이상한 경우
- API 응답 형식 확인
- `GptResponse` 인터페이스 수정

### TypeScript 에러
- `type` import 사용 (`verbatimModuleSyntax`)
- ESM 모듈 (.js 확장자 import)
