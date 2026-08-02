# 🔌 Interview API Design

This document describes the endpoints currently implemented by the backend.
All routes use the global `/api` prefix.

## 🚀 1. Create interview session

**`POST /api/sessions`**

Uploads and parses a CV, then creates a session with `status: "created"`.
Question generation does **not** start in this request; the client starts it by
opening the question stream endpoint after receiving the session ID.

### 📥 Request

Content type: `multipart/form-data`

```ts
{
  cv: File;               // required PDF, maximum 5 MB
  post: string;           // required; trimmed by the validation pipe
  jobDescription: string; // required; trimmed by the validation pipe
}
```

Extra body properties are removed by the global validation pipe.

### 📤 Response

```ts
// HTTP 201 Created
{
  sessionId: string; // UUID
}
```

### 🔄 Flow

```text
Client                                    Backend
  │  POST /api/sessions                     │
  │  { cv, post, jobDescription }           │
  ├────────────────────────────────────────>│
  │                                         │ 1. Validate PDF type and size
  │                                         │ 2. Upload <cvId>.pdf to Supabase
  │                                         │ 3. Extract and persist PDF text
  │                                         │ 4. Insert session as "created"
  │  201 { sessionId }                      │
  │<────────────────────────────────────────┤
  │  Open the SSE endpoint                  │
```

### ⚠️ Errors

- Non-PDF or files larger than 5 MB are rejected by the file validation pipe.
- Empty `post` or `jobDescription` values are rejected with HTTP 400.
- Missing or unreadable PDF content is rejected with HTTP 400.
- A Supabase CV upload failure returns HTTP 500.

---

## 📖 2. Get interview session

**`GET /api/sessions/:sessionId`**

Returns the session's public fields and all saved questions, ordered by
`createdAt` ascending.

### 📥 Request

`sessionId` must be a valid UUID.

### 📤 Response

```ts
// HTTP 200 OK
{
  id: string;
  post: string;
  jobDescription: string;
  cv: {
    id: string;
  };
  questions: Array<{
    id: string;
    question: string;
  }>;
}
```

The current response does not include `status`, the original CV filename,
question categories, or answers.

### 🔄 Flow

```text
Client                                    Backend
  │  GET /api/sessions/:sessionId           │
  ├────────────────────────────────────────>│
  │                                         │ 1. Query selected session fields
  │                                         │ 2. Query questions by sessionId
  │                                         │ 3. Sort questions oldest first
  │  200 { id, post, cv, questions, ... }   │
  │<────────────────────────────────────────┤
```

### ⚠️ Errors

- An invalid UUID is rejected with HTTP 400.
- An unknown session returns HTTP 404 with `Session not found`.

---

## 🌊 3. Stream generated questions

**`GET /api/sessions/:sessionId/questions/stream`**

Opens a Server-Sent Events (SSE) connection and starts DeepSeek question
generation. Complete question objects are parsed from the model's streamed JSON,
saved individually, and immediately sent to the client.

### 📥 Request

`sessionId` must be a valid UUID and must reference an existing session.

### 📡 SSE response

Response headers:

```text
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

Events are emitted in this order:

```ts
// 1. The backend is preparing the prompt.
event: preparing
data: {
  message: "Reading CV, position and job description..."
}

// 2. The session status has changed to "generating".
event: generating
data: {
  message: "Generating interview questions..."
}

// 3. Emitted and persisted once for every parsed question.
event: question
data: {
  questionId: string;
  question: string;
}

// 4. Generation completed and the session status is now "ready".
event: done
data: {
  count: number; // number of questions emitted in this connection
}

// Emitted instead of "done" when generation fails.
event: error
data: {
  message: string;
}
```

### 🔄 Flow

```text
Client                                    Backend
  │  GET .../questions/stream               │
  ├────────────────────────────────────────>│
  │<──────────── event: preparing ──────────┤
  │<──────────── event: generating ─────────┤ Set status to "generating"
  │                                         │ Call DeepSeek with streaming + JSON mode
  │<──────────── event: question ───────────┤ Insert one parsed question
  │<──────────── event: question ───────────┤ Insert the next parsed question
  │                    ...                  │
  │<──────────── event: done ───────────────┤ Set status to "ready"
  │                                         │ Close the SSE response
```

### ⚠️ Edge cases and current behavior

| Scenario | Current behavior |
| --- | --- |
| Session does not exist | Returns HTTP 404 before opening the SSE stream |
| DeepSeek returns an error or no questions | Sets status to `error`, emits `error`, and closes the stream |
| Client closes the connection | Aborts the DeepSeek request and stops processing; already-saved questions remain |
| Client disconnects after generation starts | The session can remain `generating` because disconnect handling does not reset its status |
| Client reconnects or streams a `ready` session | Starts generation again; existing questions are not reused or deleted, so duplicates can be added |

The backend does not implement a stream timeout. Any client-side timeout or retry
policy must be handled by the frontend.

---
