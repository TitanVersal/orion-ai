"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ORION_API_URL || "http://127.0.0.1:8000";

type SpeechRecognitionConstructor = new () => any;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type Message = {
  role: "user" | "orion";
  content: string;
};

type Status = {
  name: string;
  version: string;
  mode: string;
  status: string;
  tagline: string;
  modules: string[];
};

type ActivityEvent = {
  id: number;
  timestamp: string;
  type: string;
  source: string;
  message: string;
};

type ProjectItem = {
  key: string;
  name: string;
  type: string;
  status: string;
  description: string;
  updated_at?: string | null;
};

type MemoryItem = {
  id: number;
  category: string;
  title: string;
  content: string;
  source: string;
  importance: number;
  created_at: string;
  updated_at: string;
};

type MissionItem = {
  id: number;
  title: string;
  goal: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

type MissionRunItem = {
  id: number;
  mission_id: number;
  step_id?: number | null;
  mission_title: string;
  step_title: string;
  status: string;
  output: string;
  error: string;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
};

type ApprovalItem = {
  id: number;
  action_type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  risk_level: string;
  status: string;
  result: string;
  source: string;
  created_at: string;
  updated_at: string;
};

type ActivityResponse = {
  events?: ActivityEvent[];
};

type ProjectsResponse = {
  projects?: ProjectItem[];
};

type MemoryResponse = {
  items?: MemoryItem[];
};

type MissionsResponse = {
  missions?: MissionItem[];
};

type MissionRunsResponse = {
  runs?: MissionRunItem[];
};

type ApprovalsResponse = {
  approvals?: ApprovalItem[];
};

type ChatResponse = {
  response?: string;
};

type ActionResponse = {
  result?: string;
  output?: string;
};

type MissionReportResponse = {
  mission_id: number;
  report_path: string;
  status: string;
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");

  const [missionRuns, setMissionRuns] = useState<MissionRunItem[]>([]);
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(
    null
  );

  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(
    null
  );
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "orion",
      content:
        "O.R.I.O.N. Aurora OS dashboard online. How can I assist your mission?",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [runningMissionId, setRunningMissionId] = useState<number | null>(null);

  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Voice idle");

  async function loadStatus() {
    try {
      const data = await fetchJson<Status>("/api/status");
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }

  async function loadActivity() {
    try {
      const data = await fetchJson<ActivityResponse>("/api/activity");
      setActivity(data.events || []);
    } catch {
      setActivity([]);
    }
  }

  async function loadProjects() {
    try {
      const data = await fetchJson<ProjectsResponse>("/api/projects");
      setProjects(data.projects || []);
    } catch {
      setProjects([]);
    }
  }

  async function loadMemory() {
    try {
      const data = await fetchJson<MemoryResponse>("/api/memory");
      setMemoryItems(data.items || []);
    } catch {
      setMemoryItems([]);
    }
  }

  async function loadMissions() {
    try {
      const data = await fetchJson<MissionsResponse>("/api/missions");
      setMissions(data.missions || []);
    } catch {
      setMissions([]);
    }
  }

  async function loadMissionRuns() {
    try {
      const data = await fetchJson<MissionRunsResponse>("/api/mission-runs");
      setMissionRuns(data.runs || []);
    } catch {
      setMissionRuns([]);
    }
  }

  async function loadApprovals() {
    try {
      const data = await fetchJson<ApprovalsResponse>("/api/approvals");
      setApprovals(data.approvals || []);
    } catch {
      setApprovals([]);
    }
  }

  async function refreshDashboardData() {
    await Promise.all([
      loadActivity(),
      loadMemory(),
      loadMissions(),
      loadApprovals(),
      loadMissionRuns(),
    ]);
  }

  function speakResponse(text: string) {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function startVoiceCommand() {
  if (listening || loading) return;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceStatus(
      "Speech recognition is not supported in this browser. Use Chrome or Chromium."
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setVoiceStatus(
      "Microphone API is not available. Use Chrome/Chromium on localhost or HTTPS."
    );
    return;
  }

  try {
    setVoiceStatus("Requesting microphone permission...");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Permission check only. Release this stream before SpeechRecognition starts.
    stream.getTracks().forEach((track) => track.stop());

    const recognition = new SpeechRecognition();

    recognition.lang = "en-AU";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setVoiceStatus("Listening... Speak now.");
    };

    recognition.onspeechstart = () => {
      setVoiceStatus("Speech detected...");
    };

    recognition.onspeechend = () => {
      setVoiceStatus("Speech ended. Processing...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";

      if (!transcript.trim()) {
        setVoiceStatus("No clear speech detected. Try again.");
        return;
      }

      setVoiceStatus(`Heard: ${transcript}`);
      setMessage(transcript);

      void sendMessage(transcript, true);
    };

    recognition.onerror = (event: any) => {
      const errorCode = event?.error || "unknown";

      // Use console.warn instead of console.error so Next.js dev overlay does not show it as a hard error.
      console.warn("Speech recognition warning:", {
        error: errorCode,
        message: event?.message || "No extra browser message available.",
      });

      setListening(false);

      switch (errorCode) {
        case "not-allowed":
          setVoiceStatus(
            "Microphone permission blocked. Allow microphone access in browser settings."
          );
          break;

        case "audio-capture":
          setVoiceStatus(
            "No microphone detected. Check Ubuntu microphone input settings."
          );
          break;

        case "no-speech":
          setVoiceStatus("No speech detected. Press Speak and talk clearly.");
          break;

        case "network":
          setVoiceStatus(
            "Speech recognition network error. Chrome speech service may be unavailable."
          );
          break;

        case "service-not-allowed":
          setVoiceStatus(
            "Speech service blocked by browser or system settings."
          );
          break;

        case "language-not-supported":
          setVoiceStatus(
            "Language not supported. Try changing recognition.lang to en-US."
          );
          break;

        case "aborted":
          setVoiceStatus("Voice recognition stopped.");
          break;

        default:
          setVoiceStatus(
            `Voice recognition stopped or failed. Error: ${errorCode}`
          );
          break;
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  } catch (error) {
    console.warn("Microphone startup warning:", error);

    setListening(false);
    setVoiceStatus(
      "Microphone access failed. Check browser and Ubuntu microphone permission."
    );
  }
}   

  async function approveAction(approvalId: number) {
    try {
      const data = await fetchJson<ActionResponse>(
        `/api/approvals/${approvalId}/approve`,
        {
          method: "POST",
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} approved.\n\n${
            data.result || "Action completed."
          }`,
        },
      ]);

      await loadApprovals();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} could not be executed.`,
        },
      ]);
    }
  }

  async function rejectAction(approvalId: number) {
    try {
      const data = await fetchJson<ActionResponse>(
        `/api/approvals/${approvalId}/reject`,
        {
          method: "POST",
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} rejected.\n\n${
            data.result || "Action rejected."
          }`,
        },
      ]);

      await loadApprovals();
      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Approval ${approvalId} could not be rejected.`,
        },
      ]);
    }
  }

  async function runNextMissionStep(missionId: number) {
    if (runningMissionId === missionId) return;

    setRunningMissionId(missionId);

    try {
      const data = await fetchJson<ActionResponse>(
        `/api/missions/${missionId}/run-next`,
        {
          method: "POST",
        }
      );

      const resultText =
        data.result || data.output || "Next mission step completed.";

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Mission ${missionId} executed next step.\n\n${resultText}`,
        },
      ]);

      await refreshDashboardData();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Failed to run next step for mission ${missionId}.`,
        },
      ]);
    } finally {
      setRunningMissionId(null);
    }
  }

  async function generateMissionReport(missionId: number) {
    setGeneratingReportId(missionId);

    try {
      const data = await fetchJson<MissionReportResponse>(
        `/api/missions/${missionId}/report`,
        {
          method: "POST",
        }
      );

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Mission ${missionId} report status: ${data.status}\n\nReport path:\n${data.report_path}`,
        },
      ]);

      await loadActivity();
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: `Mission ${missionId} report generation failed.`,
        },
      ]);
    } finally {
      setGeneratingReportId(null);
    }
  }

  async function openProject(project: ProjectItem) {
    setSelectedProject(project);

    setMessage(
      `Read the project called ${project.name}. Then summarize its current status and next best development step.`
    );
  }

  async function sendMessage(customMessage?: string, speakBack = false) {
    const cleanMessage = (customMessage ?? message).trim();

    if (!cleanMessage || loading) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: cleanMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const data = await fetchJson<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanMessage,
        }),
      });

      await refreshDashboardData();

      const orionResponse =
        data.response || "No response returned from backend.";

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: orionResponse,
        },
      ]);

      if (speakBack) {
        speakResponse(orionResponse);
      }
    } catch {
      const errorMessage =
        "Connection error. Confirm the FastAPI backend is running on port 8000.";

      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content: errorMessage,
        },
      ]);

      if (speakBack) {
        speakResponse(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadActivity();
    loadProjects();
    loadMemory();
    loadMissions();
    loadApprovals();
    loadMissionRuns();

    const timer = setInterval(() => {
      refreshDashboardData();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.18),_transparent_35%)]" />

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-cyan-400/20 bg-white/5 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.45em] text-cyan-300">
              Aurora OS
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">
              O.R.I.O.N.
            </h1>

            <p className="mt-2 max-w-2xl text-slate-300">
              Operational Response and Intelligent Orchestration Network
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-black/30 px-5 py-4 text-sm">
            <p className="text-cyan-300">System Status</p>

            <p className="mt-1 text-2xl font-semibold">
              {status?.status === "online" ? "ONLINE" : "CHECKING"}
            </p>

            <p className="mt-1 text-slate-400">
              {status?.tagline || "Think. Plan. Act. Learn."}
            </p>

            {status?.version && (
              <p className="mt-2 text-xs text-slate-500">
                Version {status.version} · {status.mode}
              </p>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col rounded-3xl border border-cyan-400/20 bg-white/5 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">AI Chat Console</h2>
                <p className="text-sm text-slate-400">
                  Connected to O.R.I.O.N. backend brain
                </p>
              </div>

              <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                v1.7 Voice
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`rounded-2xl p-4 ${
                    item.role === "user"
                      ? "ml-auto max-w-[85%] border border-violet-400/20 bg-violet-500/10"
                      : "mr-auto max-w-[85%] border border-cyan-400/20 bg-cyan-500/10"
                  }`}
                >
                  <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                    {item.role === "user" ? "You" : "O.R.I.O.N."}
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                    {item.content}
                  </p>
                </div>
              ))}

              {loading && (
                <div className="mr-auto max-w-[85%] rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <p className="text-sm text-cyan-200">
                    O.R.I.O.N. is thinking...
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void sendMessage();
                    }
                  }}
                  placeholder="Ask O.R.I.O.N. something..."
                  className="flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
                />

                <button
                  onClick={() => void sendMessage()}
                  disabled={loading}
                  className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send"}
                </button>

                <button
                  onClick={() => void startVoiceCommand()}
                  disabled={listening || loading}
                  className="rounded-2xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {listening ? "Listening..." : "🎙️ Speak"}
                </button>
              </div>

              <p className="text-xs text-slate-500">{voiceStatus}</p>
            </div>
          </section>

          <aside className="grid gap-6">
            <section className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-xl font-semibold">Neural Core</h2>

              <div className="mx-auto my-8 h-56 w-56 rounded-full border border-cyan-300/40 bg-[radial-gradient(circle,_rgba(34,211,238,0.45),_rgba(15,23,42,0.15)_45%,_transparent_70%)] shadow-[0_0_80px_rgba(34,211,238,0.35)]" />

              <p className="text-center text-sm text-slate-400">
                Voice, tools, memory, and agentic planning modules connected.
              </p>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mission Run History</h2>
                  <p className="text-sm text-slate-400">
                    Controlled execution cycle records
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {missionRuns.length} runs
                </span>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {missionRuns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No mission run history yet. Run a mission step to create
                    one.
                  </p>
                ) : (
                  missionRuns.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {run.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Run #{run.id}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        {run.mission_title}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Mission ID: {run.mission_id} | Step ID:{" "}
                        {run.step_id || "N/A"}
                      </p>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {run.step_title || "No step title recorded."}
                      </p>

                      {run.error && (
                        <p className="mt-2 rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-200">
                          {run.error}
                        </p>
                      )}

                      {run.completed_at && (
                        <p className="mt-2 text-[10px] text-slate-500">
                          Completed: {run.completed_at}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Command Approval</h2>
                  <p className="text-sm text-slate-400">
                    Manual approval gate for file and command actions
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {approvals.filter((item) => item.status === "pending").length}{" "}
                  pending
                </span>
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {approvals.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No approval requests yet.
                  </p>
                ) : (
                  approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {approval.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Risk: {approval.risk_level}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        #{approval.id} — {approval.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {approval.description}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Type: {approval.action_type}
                      </p>

                      {approval.result && (
                        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-2 text-xs text-slate-400">
                          {approval.result}
                        </p>
                      )}

                      {approval.status === "pending" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => void approveAction(approval.id)}
                            className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => void rejectAction(approval.id)}
                            className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mission Planner</h2>
                  <p className="text-sm text-slate-400">
                    Structured O.R.I.O.N. goals and action plans
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {missions.length} missions
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {missions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No missions yet. Ask O.R.I.O.N. to create a mission.
                  </p>
                ) : (
                  missions.map((mission) => (
                    <div
                      key={mission.id}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {mission.status}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Priority {mission.priority}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        {mission.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {mission.goal}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => void runNextMissionStep(mission.id)}
                          disabled={runningMissionId === mission.id}
                          className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {runningMissionId === mission.id
                            ? "Running..."
                            : "Run Next Step"}
                        </button>

                        <button
                          onClick={() =>
                            setMessage(
                              `Read mission ${mission.id}. Then tell me the next best action.`
                            )
                          }
                          className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/10"
                        >
                          Inspect
                        </button>

                        <button
  onClick={() => void startVoiceCommand()}
  disabled={listening || loading}
  className="rounded-2xl border border-cyan-400/30 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
>
  {listening ? "Listening..." : "🎙️ Speak"}
</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Project Launcher</h2>
                  <p className="text-sm text-slate-400">
                    Registered O.R.I.O.N. project memory
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {projects.length} projects
                </span>
              </div>

              <div className="grid gap-3">
                {projects.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-slate-500">
                      No projects registered yet. Ask O.R.I.O.N. to register
                      one.
                    </p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.key}
                      onClick={() => void openProject(project)}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-100">
                          {project.name}
                        </h3>

                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {project.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {project.type}
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-400">
                        {project.description}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {selectedProject && (
                <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-violet-300">
                    Selected Project
                  </p>

                  <h3 className="mt-2 font-semibold text-slate-100">
                    {selectedProject.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {selectedProject.description}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Prompt loaded into chat. Press Send to ask O.R.I.O.N.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Memory Matrix</h2>
                  <p className="text-sm text-slate-400">
                    Persistent O.R.I.O.N. long-term memory
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {memoryItems.length} items
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {memoryItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No persistent memories yet. Ask O.R.I.O.N. to remember
                    something.
                  </p>
                ) : (
                  memoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-violet-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-300">
                          {item.category}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Priority {item.importance}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-slate-400">
                        {item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-cyan-400/20 bg-white/[0.06] p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Activity Stream</h2>
                  <p className="text-sm text-slate-400">
                    Recent backend events and execution logs
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
                  {activity.length} events
                </span>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
                {activity.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No activity events yet.
                  </p>
                ) : (
                  activity.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                          {event.type}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          {event.source}
                        </span>
                      </div>

                      <p className="text-sm leading-5 text-slate-300">
                        {event.message}
                      </p>

                      <p className="mt-2 text-[10px] text-slate-600">
                        {event.timestamp}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-xl font-semibold">Active Modules</h2>

              <div className="mt-4 grid gap-3">
                {(status?.modules || [
                  "AI Brain",
                  "Safe Tools",
                  "Project Memory",
                  "Developer Command Center",
                  "Voice Command Console",
                ]).map((module) => (
                  <div
                    key={module}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300"
                  >
                    {module}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
