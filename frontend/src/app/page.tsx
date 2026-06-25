"use client";

import { useEffect, useState } from "react";

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

type MissionStepItem = {
  id: number;
  mission_id: number;
  position: number;
  title: string;
  details: string;
  status: string;
  created_at: string;
  updated_at: string;
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



export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);

const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

const [missions, setMissions] = useState<MissionItem[]>([]);
const [projects, setProjects] = useState<ProjectItem[]>([]);
const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "orion",
      content:
        "O.R.I.O.N. Aurora OS dashboard online. How can I assist your mission?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/status");
      const data = await response.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }

async function loadActivity() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/activity");
    const data = await response.json();
    setActivity(data.events || []);
  } catch {
    setActivity([]);
  }
}

async function loadProjects() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/projects");
    const data = await response.json();
    setProjects(data.projects || []);
  } catch {
    setProjects([]);
  }
}

async function loadMemory() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/memory");
    const data = await response.json();
    setMemoryItems(data.items || []);
  } catch {
    setMemoryItems([]);
  }
}

async function loadMissions() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/missions");
    const data = await response.json();
    setMissions(data.missions || []);
  } catch {
    setMissions([]);
  }
}

async function loadApprovals() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/approvals");
    const data = await response.json();
    setApprovals(data.approvals || []);
  } catch {
    setApprovals([]);
  }
}

async function approveAction(approvalId: number) {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/approvals/${approvalId}/approve`,
      { method: "POST" }
    );

    const data = await response.json();

    setMessages((current) => [
      ...current,
      {
        role: "orion",
        content: `Approval ${approvalId} approved.\n\n${data.result}`,
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
    const response = await fetch(
      `http://127.0.0.1:8000/api/approvals/${approvalId}/reject`,
      { method: "POST" }
    );

    const data = await response.json();

    setMessages((current) => [
      ...current,
      {
        role: "orion",
        content: `Approval ${approvalId} rejected.\n\n${data.result}`,
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

async function openProject(project: ProjectItem) {
  setSelectedProject(project);

  const prompt = `Read the project called ${project.name}. Then summarize its current status and next best development step.`;

  setMessage(prompt);
}

  async function sendMessage() {
    const cleanMessage = message.trim();

    if (!cleanMessage || loading) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: cleanMessage },
    ]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: cleanMessage }),
      });

      const data = await response.json();
	await loadActivity();
	await loadMemory();
	await loadMissions();
	await loadApprovals();

      setMessages((current) => [
        ...current,
        { role: "orion", content: data.response },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "orion",
          content:
            "Connection error. Confirm the FastAPI backend is running on port 8000.",
        },
      ]);
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

  const timer = setInterval(() => {
    loadActivity();
    loadMemory();
    loadMissions();
    loadApprovals();
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
                v1.5
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
              {messages.map((item, index) => (
                <div
                  key={index}
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

            <div className="mt-4 flex gap-3">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Ask O.R.I.O.N. something..."
                className="flex-1 rounded-2xl border border-cyan-400/20 bg-black/40 px-4 py-3 text-sm outline-none ring-cyan-400/30 placeholder:text-slate-500 focus:ring-2"
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="rounded-2xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
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
      <h2 className="text-xl font-bold">Command Approval</h2>
      <p className="text-sm text-slate-400">
        Manual approval gate for file and command actions
      </p>
    </div>
    <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
      {approvals.filter((item) => item.status === "pending").length} pending
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
                onClick={() => approveAction(approval.id)}
                className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Approve
              </button>

              <button
                onClick={() => rejectAction(approval.id)}
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
        <button
          key={mission.id}
          onClick={() =>
            setMessage(
              `Read mission ${mission.id}. Then tell me the next best action.`
            )
          }
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
        </button>
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
      v1.5
    </span>
  </div>


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
        No persistent memories yet. Ask O.R.I.O.N. to remember something.
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


  <div className="grid gap-3">
    {projects.length === 0 ? (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-sm text-slate-500">
          No projects registered yet. Ask O.R.I.O.N. to register one.
        </p>
      </div>
    ) : (
      projects.map((project) => (
        <button
          key={project.key}
          onClick={() => openProject(project)}
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

            <section className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-xl font-semibold">Active Modules</h2>

		<section className="rounded-3xl border border-cyan-400/20 bg-white/5 p-5 backdrop-blur">
  			<div className="mb-4 flex items-center justify-between">
   			 <div>
     			 <h2 className="text-xl font-semibold">Live Activity Timeline</h2>
     			 <p className="text-sm text-slate-400">
     			   Real-time O.R.I.O.N. system events
     	 </p>
    </div>
    <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300">
      LIVE
    </span>
  </div>

  <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-4">
    {activity.length === 0 ? (
      <p className="text-sm text-slate-500">No activity recorded yet.</p>
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
              {event.timestamp.split("T")[1] || event.timestamp}
            </span>
          </div>

          <p className="text-xs text-slate-400">{event.source}</p>
          <p className="mt-1 text-sm leading-5 text-slate-200">
            {event.message}
          </p>
        </div>
      ))
    )}
  </div>
</section>

              <div className="mt-4 grid gap-3">
                {(status?.modules || [
                  "AI Brain",
                  "Safe Tools",
                  "Project Memory",
                  "Developer Command Center",
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
