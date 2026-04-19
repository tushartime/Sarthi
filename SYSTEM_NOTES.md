## Sarthi – System Overview (Easy Notes)

### What Sarthi Is

- **Sarthi** is a SaaS product that:
  - Lets hosts create and run webinars.
  - Lets viewers join those webinars and watch a demo video.
  - Uses an **AI sales agent** to talk to viewers and turn conversations into leads.

---

### Main Pieces of the Product

- **Frontend**
  - Built with **Next.js (App Router)**, **React**, **TypeScript**, **Tailwind**.
  - UI for:
    - Public pages: landing, demo, live webinar, AI agent page.
    - Protected dashboard: home, webinars list, webinar details, leads.

- **Backend**
  - Next.js **server components**, **server actions**, and **API routes**.
  - **PostgreSQL + Prisma** for data.
  - **Clerk** for auth (sign‑in/sign‑up and current user).

- **External services**
  - **Stream** (video + chat) for real live webinar rooms (optional, currently mostly used for layout).
  - **Sarvam AI** for:
    - Speech‑to‑text (STT).
    - Chat LLM (sales reasoning).
    - Text‑to‑speech (TTS voice replies).

---

### Data Models (simplified)

- `User`
  - Created from Clerk user on first login.
  - Fields: `id`, `clerkId`, `email`, `name`, `profileImage`, Stripe fields, etc.

- `Webinar`
  - One row per webinar or demo webinar.
  - Fields:
    - `title`, `description`.
    - `startTime`, `endTime`, `duration`.
    - `webinarStatus`: `SCHEDULED`, `WAITING_ROOM`, `LIVE`, `ENDED`, `CANCELLED`.
    - `presenterId` → `User`.
    - CTA config: `ctaType` (`BOOK_A_CALL` or `BUY_NOW`), `ctaLabel`, `priceId`, `aiAgentId`, `tags[]`.

- `Attendee`
  - Unique by `email`.
  - Fields: `id`, `email`, `name`, `callStatus`.

- `Attendance`
  - Join table between `Attendee` and `Webinar`.
  - Fields: `id`, `webinarId`, `attendeeId`, `attendedType`.
  - `attendedType` is used for **lead tagging**:
    - `BREAKOUT_ROOM` → interested (from AI conversation).
    - `FOLLOW_UP` → needs follow‑up.

---

### Key Flows

#### 1. Host creates a webinar

- Host logs in via **Clerk**.
- In the dashboard, they fill a form (title, description, date/time, CTA, etc.).
- Server action `createWebinar(formData)`:
  - Authenticates with `onAuthenticateUser()` (Clerk).
  - Validates the data.
  - Creates a `Webinar` row in Postgres via Prisma.
  - Returns a success response with the webinar id and links.

#### 2. Viewer joins a webinar

- Public URL: `/live-webinar/[liveWebinarId]`.
- Server loads:
  - The `Webinar` row by id.
  - Current user if logged in (for host vs attendee logic).
- If `webinarStatus` is **not LIVE**:
  - Shows **“Seems like you are a little early”** message.
  - Renders a **countdown** (`CountdownTimer`) to `startTime`.
  - Shows a **Get Reminder / Join Webinar** button (handled by `WaitlistComponent`).
- If `webinarStatus` is **LIVE**:
  - Renders `RenderWebinar` → `LiveStreamState` → `LiveWebinarView`.
  - For now, if no Stream host is present, `LiveWebinarView` shows **`demo.mp4`** as the main video so there is always something to watch.
  - Footer shows a CTA button:
    - **“Talk to AI about booking/buying”**.
    - Clicking it sends the viewer to `/demo/agent/[webinarId]`.

#### 3. Demo webinar (no login)

- Page `/demo` explains the idea and lets visitors create a demo room:
  - When they click “Create demo webinar link”:
    - Frontend calls `POST /api/demo-webinar`.
    - Backend:
      - Upserts a **demo presenter user**.
      - Creates a `Webinar` row with `tags = ['demo']`, `webinarStatus = LIVE`, and a default AI‑friendly description.
      - Returns `/live-webinar/[id]`.
- Visiting that live‑webinar URL:
  - Detects the `demo` tag.
  - Shows `DemoVideoView` (always `demo.mp4`) with a **“Talk to the AI agent”** button that links to `/demo/agent/[webinarId]`.

---

### AI Sales Agent – End‑to‑End

#### Where it lives

- **Route**: `/demo/agent/[webinarId]`.
- Server:
  - Loads the `Webinar` and presenter for that id.
- Client:
  - Renders `SalesBreakout` – the voice sales agent UI.

#### What the browser does (`SalesBreakout`)

- The viewer enters **name** and **email** (required).
- When they click **Talk**:
  - `MicVAD` from `@ricky0123/vad-web` starts listening to the mic.
  - When **speech ends**, the VAD gives a `Float32Array` of audio at 16 kHz.
  - We:
    - Convert that audio to 16‑bit PCM.
    - Wrap it in a WAV header.
    - Base64‑encode the WAV.
    - Send it to `POST /api/demo-agent/respond` with:
      - `webinarId`
      - `audioWavBase64`
      - extra context (`agentInfo`) based on webinar title/description.
- When the server responds, we:
  - Append:
    - A **user bubble** with the transcript.
    - An **agent bubble** with the reply text.
  - If there is TTS audio:
    - Convert base64 → Blob URL → set on an `<audio>` element.
    - Let the user play the reply (browser audio).

#### What the AI orchestration API does (`/api/demo-agent/respond`)

1. **Load context**
   - Look up the `Webinar` by id (via Prisma) to get:
     - `title`
     - `description`
     - presenter info.

2. **Speech‑to‑Text (Sarvam – saaras:v3)**
   - Decode the base64 WAV into bytes.
   - Build a `FormData` request:
     - `model = "saaras:v3"`.
     - `mode = "transcribe"`.
     - `language_code = "en-IN"`.
     - `file = speech.wav` (audio/wav).
   - POST to `https://api.sarvam.ai/speech-to-text` with header `api-subscription-key: SARVAM_API_KEY`.
   - Read the `transcript` from the response.

3. **Sales reasoning (Sarvam‑30B chat completion)**
   - Build a **system prompt** that includes:
     - Product name and pitch from the webinar.
     - Instructions:
       - Be short, conversational, and focused on value and outcomes.
       - Ask **only one** focused question per turn.
       - Do **not** talk about “showing a demo” (the demo video is already playing).
       - If price is a concern, offer a **one‑time 10% discount**.
       - If the user still refuses, add the line `LEAD_STATUS:COLD` plus a short reason.
   - Call `https://api.sarvam.ai/v1/chat/completions`:
     - `model = "sarvam-30b"`.
     - `messages = [system, user(transcript)]`.
   - Parse:
     - `replyTextRaw` = full LLM output.
     - `replyText` = reply without the `LEAD_STATUS` part.
     - `coldLead` flag + `coldLeadReason` if the marker exists.

4. **Text‑to‑Speech (Sarvam – bulbul:v3)**
   - POST to `https://api.sarvam.ai/text-to-speech` with JSON:
     - `text: replyText`.
     - `target_language_code: "en-IN"`.
     - `speaker: "shreya"`.
     - `model: "bulbul:v3"`.
   - Read `audios[0]` — a base64 WAV string.

5. **Return to browser**
   - JSON response contains:
     - `transcript` (what the user said).
     - `replyText`.
     - `audioBase64` (WAV as base64).
     - `coldLead` + `coldLeadReason`.

---

### Lead Creation & Tagging

- Every time the AI finishes a reply, the frontend calls `POST /api/leads`:
  - `email`, `name` – from viewer form.
  - `webinarId`.
  - `status`:
    - `'INTERESTED'` – normal case.
    - `'FOLLOW_UP'` – if `coldLead` is true.
  - Optional `reason` (for follow‑up context).

- `/api/leads`:
  - Upserts an `Attendee` using the email.
  - Upserts an `Attendance` row with:
    - `attendedType = BREAKOUT_ROOM` when status = `INTERESTED`.
    - `attendedType = FOLLOW_UP` when status = `FOLLOW_UP`.

- The **Leads dashboard** (`/lead`) can query these tables and show:
  - Who spoke to the AI agent.
  - Which webinar they came from.
  - Whether they are **interested** or need **follow‑up**.

---

### Simple Narrative for Stakeholders

1. A host creates a webinar and shares the link.  
2. Viewers join, watch the demo video, and if interested, click **“Talk to AI about booking/buying”**.  
3. The AI agent listens to them, answers questions, handles objections, and guides them toward a decision.  
4. Every conversation is saved into the database as a **lead**, tagged as **interested** or **follow‑up**.  
5. The host sees these people in the **Leads** section and can take next steps (manual follow‑up, calls, campaigns, etc.).  

