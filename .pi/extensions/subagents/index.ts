import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";

const MAX_OUTPUT_CHARS = 60_000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_MAX_DEPTH = 1;

type Role = "general" | "researcher" | "reviewer" | "architect" | "tester" | "implementer" | "custom";
type ToolMode = "read-only" | "inspect" | "full";

const ROLE_PROMPTS: Record<Role, string> = {
  general:
    "You are a focused general-purpose sub-agent. Complete the delegated task, cite concrete files or commands when relevant, and return a concise result for the parent agent.",
  researcher:
    "You are a read-only research sub-agent. Investigate the codebase or docs, gather evidence, cite file paths and line references where possible, and do not modify files.",
  reviewer:
    "You are a code review sub-agent. Look for correctness, regressions, security, performance, maintainability, and test gaps. Return prioritized findings with evidence. Do not modify files unless explicitly asked and tool mode allows it.",
  architect:
    "You are an architecture sub-agent. Analyze boundaries, data flow, tradeoffs, risks, and implementation strategy. Return a concise recommendation with alternatives and rationale. Do not modify files unless explicitly asked and tool mode allows it.",
  tester:
    "You are a testing sub-agent. Inspect tests, identify missing coverage, propose or run safe verification commands when tools allow it, and return actionable testing guidance. Do not modify files unless explicitly asked and tool mode allows it.",
  implementer:
    "You are an implementation sub-agent. Make the smallest safe changes needed for the delegated task if tool mode allows editing. Return changed files, verification performed, and any remaining risks.",
  custom:
    "You are a specialized sub-agent. Follow the caller-provided instructions exactly and return a concise result for the parent agent.",
};

function toolArgs(mode: ToolMode): string[] {
  if (mode === "full") return [];
  if (mode === "inspect") return ["--tools", "read,grep,find,ls,bash"];
  return ["--tools", "read,grep,find,ls"];
}

function trimOutput(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n\n[output truncated to ${MAX_OUTPUT_CHARS} chars]`;
}

function buildPrompt(input: {
  role: Role;
  task: string;
  customInstructions?: string;
  parentContext?: string;
  toolMode: ToolMode;
}) {
  return [
    ROLE_PROMPTS[input.role],
    input.customInstructions ? `Additional role instructions:\n${input.customInstructions}` : undefined,
    input.parentContext ? `Parent-agent context:\n${input.parentContext}` : undefined,
    `Tool mode: ${input.toolMode}.`,
    input.toolMode === "read-only"
      ? "You only have read/search/list tools. Do not attempt to modify files."
      : input.toolMode === "inspect"
        ? "You may run shell commands for inspection, but do not modify files."
        : "You may use the available tools to complete the task, including edits if appropriate.",
    "Return format:\n- Direct answer / result\n- Evidence and file paths\n- Changes made, if any\n- Verification performed, if any\n- Remaining risks or follow-ups",
    `Delegated task:\n${input.task}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function runSubagent(opts: {
  piCommand: string;
  args: string[];
  cwd: string;
  timeout: number;
  signal: AbortSignal;
  depth: number;
  maxDepth: number;
}): Promise<{ output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(opts.piCommand, opts.args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PI_SUBAGENT_DEPTH: String(opts.depth + 1),
        PI_SUBAGENT_MAX_DEPTH: String(opts.maxDepth),
      },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      const err = new Error("Timed out after " + opts.timeout + "ms");
      (err as any).killed = true;
      reject(err);
    }, opts.timeout);

    const onAbort = () => {
      clearTimeout(timer);
      child.kill("SIGTERM");
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (opts.signal.aborted) {
      onAbort();
      return;
    }
    opts.signal.addEventListener("abort", onAbort, { once: true });

    child.on("close", (code) => {
      clearTimeout(timer);
      opts.signal.removeEventListener("abort", onAbort);
      const combined = [
        stdout.trim(),
        stderr.trim() ? `\n[stderr]\n${stderr.trim()}` : "",
      ].join("");
      if (code === 0 || code === null) {
        resolve({ output: combined || "Sub-agent completed with no output." });
      } else {
        const err = new Error(combined || `Exited with code ${code}`);
        (err as any).exitCode = code;
        reject(err);
      }
    });
  });
}

export default function subagentsExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "subagent_run",
    label: "Run Sub-Agent",
    description:
      "Delegate a focused task to a fresh pi sub-agent process. Use when a specialist review, research task, parallel investigation, or isolated second opinion would help.",
    promptSnippet:
      "Delegate focused work to a fresh pi sub-agent process and return its result.",
    promptGuidelines: [
      "Use subagent_run when the user explicitly asks you to use a sub-agent, delegate, get a second opinion, run a specialist review, or split investigation work.",
      "Use subagent_run proactively when a focused specialist can investigate independently without disrupting the main reasoning flow.",
      "Prefer subagent_run with tool_mode=read-only for research/review/architecture tasks. Use tool_mode=full only when edits are explicitly desired or clearly necessary.",
      "After subagent_run returns, critically evaluate the result; do not treat it as automatically correct.",
    ],
    parameters: Type.Object({
      role: Type.Union([
        Type.Literal("general"),
        Type.Literal("researcher"),
        Type.Literal("reviewer"),
        Type.Literal("architect"),
        Type.Literal("tester"),
        Type.Literal("implementer"),
        Type.Literal("custom"),
      ], {
        description: "Specialist role to use for the sub-agent.",
      }),
      task: Type.String({ description: "The exact delegated task for the sub-agent." }),
      custom_instructions: Type.Optional(
        Type.String({ description: "Extra role instructions, especially when role is custom." }),
      ),
      parent_context: Type.Optional(
        Type.String({ description: "Brief context from the main agent that the sub-agent needs." }),
      ),
      tool_mode: Type.Optional(
        Type.Union([Type.Literal("read-only"), Type.Literal("inspect"), Type.Literal("full")], {
          description:
            "Tool access for the sub-agent. read-only = read/search/list only. inspect = read/search/list/bash. full = all default pi tools.",
        }),
      ),
      model: Type.Optional(
        Type.String({ description: "Optional pi model pattern/provider model, e.g. anthropic/claude-sonnet-4.5." }),
      ),
      timeout_seconds: Type.Optional(Type.Number({ description: "Optional timeout in seconds." })),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const depth = Number(process.env.PI_SUBAGENT_DEPTH ?? "0");
      const maxDepth = Number(process.env.PI_SUBAGENT_MAX_DEPTH ?? String(DEFAULT_MAX_DEPTH));
      if (depth >= maxDepth) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Sub-agent depth limit reached (${depth}/${maxDepth}). Refusing to spawn nested sub-agent.`,
            },
          ],
          details: { depth, maxDepth },
        };
      }

      const role = params.role as Role;
      const toolMode = (params.tool_mode ?? "read-only") as ToolMode;
      const timeout = Math.max(1, params.timeout_seconds ?? DEFAULT_TIMEOUT_MS / 1000) * 1000;
      const prompt = buildPrompt({
        role,
        task: params.task,
        customInstructions: params.custom_instructions,
        parentContext: params.parent_context,
        toolMode,
      });

      const piCommand = process.env.PI_SUBAGENT_COMMAND ?? "pi";
      const args = [
        "--print",
        "--no-session",
        "--no-extensions",
        ...toolArgs(toolMode),
        ...(params.model ? ["--model", params.model] : []),
        prompt,
      ];

      onUpdate?.({
        content: [
          {
            type: "text",
            text: `Running ${role} sub-agent (${toolMode})...`,
          },
        ],
        details: { role, toolMode, command: piCommand, args: args.slice(0, -1).concat("<prompt>") },
      });

      try {
        const result = await runSubagent({
          piCommand,
          args,
          cwd: ctx.cwd,
          timeout,
          signal,
          depth,
          maxDepth,
        });
        return {
          content: [{ type: "text", text: trimOutput(result.output) }],
          details: { role, toolMode, model: params.model, timeoutSeconds: timeout / 1000 },
        };
      } catch (error: any) {
        const message = `Sub-agent failed: ${error?.message ?? String(error)}`;
        return {
          isError: true,
          content: [{ type: "text", text: trimOutput(message) }],
          details: { role, toolMode, model: params.model, timeoutSeconds: timeout / 1000 },
        };
      }
    },
  });

  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt:
        event.systemPrompt +
        "\n\nSub-agent capability: You have access to subagent_run. Use it when the user asks for sub-agents/delegation/second opinions, or when a focused specialist investigation would materially improve the result. Default to read-only unless edits are explicitly needed. Always evaluate sub-agent output critically before acting on it.",
    };
  });
}
