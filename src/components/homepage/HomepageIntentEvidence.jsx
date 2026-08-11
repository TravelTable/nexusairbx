const intentPages = [
  {
    href: "/roblox-script-generator",
    title: "Roblox Script Generator",
    description: "Generate a focused Luau script from a plain-language prompt.",
  },
  {
    href: "/roblox-ai-scripter",
    title: "AI Roblox Scripter",
    description: "Debug and improve an existing Roblox script with AI assistance.",
  },
  {
    href: "/roblox-lua-script-generator",
    title: "Roblox Lua Generator",
    description: "Create typed Luau modules and reusable game logic.",
  },
  {
    href: "/roblox-studio-script-generator",
    title: "Roblox Studio AI",
    description: "Plan coordinated changes across scripts and Studio locations.",
  },
  {
    href: "/roblox-gui-maker",
    title: "Roblox GUI Generator",
    description: "Build responsive Roblox interface code and interaction logic.",
  },
];

const roundTimerCode = `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local timerEvent = ReplicatedStorage:FindFirstChild("RoundTimerUpdate")
if not timerEvent then
    timerEvent = Instance.new("RemoteEvent")
    timerEvent.Name = "RoundTimerUpdate"
    timerEvent.Parent = ReplicatedStorage
end

local INTERMISSION_SECONDS = 10
local ROUND_SECONDS = 60

local function broadcast(phase, remaining)
    timerEvent:FireAllClients({
        phase = phase,
        remaining = remaining,
    })
end

local function countdown(phase, duration)
    for remaining = duration, 0, -1 do
        broadcast(phase, remaining)
        task.wait(1)
    end
end

while true do
    countdown("Intermission", INTERMISSION_SECONDS)

    if #Players:GetPlayers() == 0 then
        broadcast("Waiting for players", 0)
        task.wait(2)
    else
        countdown("Round", ROUND_SECONDS)
    end
end`;

export default function HomepageIntentEvidence() {
  return (
    <>
      <section
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6"
        aria-labelledby="homepage-intent-heading"
      >
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">
            Choose your workflow
          </p>
          <h2
            id="homepage-intent-heading"
            className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--ds-text)] sm:text-4xl"
          >
            AI tools for the Roblox scripting task in front of you
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--ds-text-secondary)]">
            Start with a focused generator, repair existing code, or plan a coordinated
            multi-file change for Roblox Studio.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {intentPages.map((page) => (
            <a
              key={page.href}
              href={page.href}
              className="group rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-1)] p-5 transition-[background-color,border-color,transform] hover:border-[var(--ds-accent-border)] hover:bg-[var(--ds-fill-hover)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] motion-reduce:transform-none"
            >
              <h3 className="text-lg font-semibold tracking-[-0.015em] text-[var(--ds-text)] group-hover:text-[var(--ds-accent)]">
                {page.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ds-text-secondary)]">
                {page.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-semibold text-[var(--ds-accent)]">
                Explore this tool <span aria-hidden="true">&nbsp;→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6"
        aria-labelledby="homepage-evidence-heading"
        data-evidence-example="homepage-round-timer"
      >
        <div className="overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-1)] shadow-sm shadow-black/5">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ds-accent)]">
                Reviewable product evidence
              </p>
              <h2
                id="homepage-evidence-heading"
                className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--ds-text)]"
              >
                A server round timer, from prompt to Studio placement
              </h2>
              <p className="mt-4 inline-flex rounded-full border border-[var(--ds-warning)] bg-[var(--ds-fill-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ds-warning)]">
                Manual Studio verification required
              </p>

              <dl className="mt-7 space-y-5 text-sm">
                <div>
                  <dt className="font-semibold text-[var(--ds-text)]">Prompt</dt>
                  <dd className="mt-1 leading-6 text-[var(--ds-text-secondary)]">
                    Make a server round timer with a 10-second intermission, a 60-second
                    round, and updates clients can display.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--ds-text)]">File and class</dt>
                  <dd className="mt-1 leading-6 text-[var(--ds-text-secondary)]">
                    <code>RoundTimer.server.lua</code> — Roblox <code>Script</code>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--ds-text)]">Studio location</dt>
                  <dd className="mt-1 leading-6 text-[var(--ds-text-secondary)]">
                    <code>ServerScriptService/RoundTimer</code>
                  </dd>
                </div>
              </dl>
            </div>

            <pre className="m-0 overflow-x-auto border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-3)] p-6 text-xs leading-6 text-[var(--ds-text-secondary)] lg:border-l lg:border-t-0">
              <code>{roundTimerCode}</code>
            </pre>
          </div>

          <div className="grid gap-5 border-t border-[var(--ds-border-subtle)] p-6 sm:p-8 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-[var(--ds-text)]">Setup</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--ds-text-secondary)]">
                <li>Create a Script named RoundTimer in ServerScriptService.</li>
                <li>Paste the complete code above; the RemoteEvent is created automatically.</li>
                <li>Add a client HUD listener if you want to show the timer on screen.</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ds-text)]">Verification checklist</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--ds-text-secondary)]">
                <li>Run a two-player Studio test and inspect RoundTimerUpdate.</li>
                <li>Confirm Intermission counts from 10 and Round counts from 60.</li>
                <li>Confirm the waiting state appears when the server has no players.</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ds-text)]">Expected result</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ds-text-secondary)]">
                Every connected client receives the same phase and remaining-time payload
                once per second.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ds-text)]">Limitations</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ds-text-secondary)]">
                This example does not select maps, award winners, or render a HUD. Complete
                manual verification in a test place before shipping it in a live experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
