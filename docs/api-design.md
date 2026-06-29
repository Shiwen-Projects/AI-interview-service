# API Design Document

## 1. Create Interview Session

**`POST /sessions`**

Extracts CV text, saves a new session to the DB with `status: "generating"`, then kicks off AI question generation **asynchronously** (does not wait for AI to finish). Returns `sessionId` immediately so the client can navigate to the session page and open the SSE stream.

### Input

```ts
// multipart/form-data
CreateSessionInput {
  cv:              File;    // PDF or DOCX — server extracts text server-side
  post:            string;  // e.g. "Senior Frontend Engineer"
  jobDescription:  string;  // raw JD text pasted by user
}
```

### Output

```ts
// HTTP 201 Created
CreateSessionPayload {
  sessionId: string;  // UUID, used in all subsequent requests
}
```

### Flow

```
Client                                  Backend
  |                                         |
  |  POST /sessions  { cv, post, jd }       |
  |────────────────────────────────────────>|
  |                                         |  1. Extract text from CV file
  |                                         |  2. INSERT session (status: "generating")
  |                                         |  3. Kick off AI generation (async)
  |  201 { sessionId: "abc123" }            |
  |<────────────────────────────────────────|
  |                                         |
  |  navigate to /session/abc123            |
```

---

## 2. Stream Questions

**`GET /sessions/:sessionId/questions/stream`**

Opens a persistent **Server-Sent Events (SSE)** connection. The backend pushes each question to the client as soon as the AI generates it, then emits a `done` event and closes the connection. If the user returns to an existing `ready` session, use API 3 instead — do not re-stream.

### Input

```ts
// URL param
sessionId: string;
```

### Output (SSE event stream)

```ts
// event: "question"  — emitted once per question, up to 10 times
QuestionEvent {
  questionId:  string;
  question:    string;
  category?:   "technical" | "behavioral" | "system_design";
}

// event: "done"  — emitted once after all questions are saved
// event: "error" — emitted if AI call fails
ErrorEvent {
  message: string;
}
```

### Flow

```
Client                                         Backend
  |                                               |
  |  GET /sessions/abc123/questions/stream        |
  |  (opens SSE connection)                       |
  |──────────────────────────────────────────────>|
  |                                               |  Calls AI API (streaming enabled)
  |                                               |  Parses each question as tokens arrive
  |                                               |
  |  event: question { id: q1, text: "..." }      |
  |<──────────────────────────────────────────────|  → INSERT Q1 to DB, push to client
  |  [Q1 appears on screen]                       |
  |                                               |
  |  event: question { id: q2, text: "..." }      |
  |<──────────────────────────────────────────────|  → INSERT Q2 to DB, push to client
  |  [Q2 appears on screen]                       |
  |                                               |
  |  ... Q3 through Q10 ...                       |
  |                                               |
  |  event: done                                  |
  |<──────────────────────────────────────────────|  → UPDATE session status = "ready"
  |  [connection closes]                          |
```

### Edge Cases

| Scenario | Behaviour |
|---|---|
| AI API fails mid-stream | Emit `error` event, set session `status: "error"` in DB |
| User closes tab mid-stream | SSE connection drops; session remains `status: "generating"` in DB — user can retry |
| Client polls more than 15s with no `done` | Client closes connection, shows retry button |

---

## 3. Get Session

**`GET /sessions/:sessionId`**

Fetches a saved session and its questions from the DB. Used when a user **returns to an existing session** (status is already `ready`) — no re-streaming needed.

### Input

```ts
// URL param
sessionId: string;
```

### Output

```ts
// HTTP 200 OK
GetSessionPayload {
  sessionId:  string;
  post:       string;
  status:     "generating" | "ready" | "error";
  questions:  Question[];
}

Question {
  questionId:   string;
  question:     string;
  category?:    "technical" | "behavioral" | "system_design";
  answer?:      Answer;  // null if not yet answered
}

Answer {
  answerId:       string;
  answer:         string;
  overallScore:   number;               // 0–100
  scoreBreakdown: Record<string, number>; // e.g. { "逻辑性": 90, "完整性": 70 }
  suggestion:     string;
}
```

### Flow

```
Client                                  Backend
  |                                         |
  |  GET /sessions/abc123                   |
  |────────────────────────────────────────>|
  |                                         |  SELECT session + questions + answers
  |  200 { status: "ready", questions: [] } |
  |<────────────────────────────────────────|
  |                                         |
  |  Render questions directly              |
  |  (no polling or SSE needed)             |
```

---

## 4. Submit Answer

**`POST /sessions/:sessionId/questions/:questionId/answers`**

Saves the user's answer and calls the AI **synchronously** to evaluate it. The user is actively waiting for feedback, so this is a standard request-response (not streamed). Returns scores and a suggestion.

### Input

```ts
// URL params
sessionId:  string;
questionId: string;

// JSON body
SubmitAnswerInput {
  answer: string;
}
```

### Output

```ts
// HTTP 201 Created
SubmitAnswerPayload {
  answerId:       string;
  overallScore:   number;                 // 0–100
  scoreBreakdown: Record<string, number>; // e.g. { "逻辑性": 90, "完整性": 70 }
  suggestion:     string;
}
```

### Flow

```
Client                                       Backend
  |                                               |
  |  POST /sessions/abc123/questions/q1/answers   |
  |  { answer: "My answer text..." }              |
  |──────────────────────────────────────────────>|
  |                                               |  1. INSERT answer to DB
  |                                               |  2. Call AI to evaluate (sync, awaited)
  |                                               |  3. UPDATE answer with scores
  |  201 { overallScore, scoreBreakdown,          |
  |         suggestion }                          |
  |<──────────────────────────────────────────────|
  |                                               |
  |  Display score + feedback inline              |
```

---

## API Summary

| # | Method | Path | Description |
|---|---|---|---|
| 1 | `POST` | `/sessions` | Create session, trigger async AI generation |
| 2 | `GET` | `/sessions/:id/questions/stream` | SSE stream — push questions as AI generates them |
| 3 | `GET` | `/sessions/:id` | Fetch saved session + questions (returning user) |
| 4 | `POST` | `/sessions/:id/questions/:qid/answers` | Submit answer, get AI evaluation |
