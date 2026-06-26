import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "How to play — ScorIQ" },
      { name: "description", content: "Learn how to make predictions, earn points, and compete with friends on ScorIQ." },
    ],
  }),
  component: GuidePage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground">
        {n}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

function GuidePage() {
  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <img src="/logo.png" alt="ScorIQ" className="h-8 w-8 object-contain" />
        </div>

        <h1 className="font-display text-4xl leading-tight">How to play</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ScorIQ is a football score prediction game. Predict match results, earn points,
          and see how you rank against your friends.
        </p>

        <div className="mt-10 space-y-10">

          {/* Getting started */}
          <Section title="1. Getting started">
            <div className="space-y-4">
              <Step n={1} title="Create or join a group">
                Go to the <strong>Groups</strong> tab and tap <strong>Create group</strong>.
                Pick a league, give your group a name and an emoji, then share the invite link
                with your friends so they can join.
              </Step>
              <Step n={2} title="Join an existing group">
                If a friend already created a group, ask them to share the invite link. Open the
                link and tap <strong>Join</strong> — you're in instantly.
              </Step>
              <Step n={3} title="Wait for matches to be published">
                Fixtures are published centrally by the ScorIQ team. Once the round is live you'll
                see all upcoming matches on the <strong>To Predict</strong> tab of your group.
              </Step>
            </div>
          </Section>

          {/* Making predictions */}
          <Section title="2. Making predictions">
            <p>
              For each match in the round, enter the score you think will happen at full time —
              goals only, no extra time or penalties.
            </p>
            <div className="mt-4 rounded-3xl border border-border bg-surface p-4 text-sm">
              <p className="font-semibold">Example</p>
              <p className="mt-1 text-muted-foreground">
                Arsenal vs Chelsea — you predict <strong>2 – 1</strong>. Type 2 in the left box and
                1 in the right box. Your prediction saves automatically.
              </p>
            </div>
            <p className="mt-3">
              Predictions are <strong>locked at kickoff</strong> — you can't change them once the
              match starts. You can update them any time before the whistle.
            </p>
            <p>
              Predictions stay hidden from your group members until the match kicks off, so no
              one can copy you at the last minute.
            </p>
          </Section>

          {/* Scoring */}
          <Section title="3. How points are scored">
            <p>Each prediction is scored after the final whistle:</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <Badge label="Exact" color="bg-success/15 text-success" />
                <div>
                  <p className="font-semibold">Correct scoreline — 5 points</p>
                  <p className="text-muted-foreground">
                    You predicted <strong>2–1</strong> and the result was <strong>2–1</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <Badge label="Correct" color="bg-primary/15 text-primary" />
                <div>
                  <p className="font-semibold">Correct outcome — 2 points</p>
                  <p className="text-muted-foreground">
                    You predicted <strong>2–1</strong>, result was <strong>3–0</strong>. You got
                    the home win right but not the exact score.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <Badge label="Wrong" color="bg-muted text-muted-foreground" />
                <div>
                  <p className="font-semibold">Wrong outcome — 0 points</p>
                  <p className="text-muted-foreground">
                    You predicted a home win but it was a draw or away win.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Joker */}
          <Section title="4. The Joker">
            <p>
              Once per round you can mark one prediction as your <strong>Joker</strong> — tap the
              ★ star icon on the match card.
            </p>
            <p>
              If your Joker prediction earns points, they are <strong>doubled</strong>. Pick the
              match you're most confident about.
            </p>
            <div className="mt-3 rounded-3xl border border-border bg-surface p-4 text-sm">
              <p className="font-semibold">Example</p>
              <p className="mt-1 text-muted-foreground">
                You mark Arsenal vs Chelsea as your Joker and predict the exact score correctly
                (5 pts). You earn <strong>10 points</strong> for that match instead of 5.
              </p>
            </div>
            <p className="mt-3">
              You can change your Joker at any time before kickoff. You don't have to use it —
              but you should!
            </p>
          </Section>

          {/* Leaderboard */}
          <Section title="5. Standings &amp; leaderboard">
            <p>
              Points accumulate across all rounds in your group. Tap the <strong>🏆 Standings</strong>
              button in the group header to see the current leaderboard at any time.
            </p>
            <p>
              You can be a member of multiple groups at the same time — even groups following the
              same league. Your predictions are independent in each group, so you can try different
              strategies.
            </p>
          </Section>

          {/* Prediction visibility */}
          <Section title="6. Prediction visibility">
            <p>
              By default, your picks stay hidden from other group members until the match kicks off —
              this keeps things competitive and prevents last-minute copying.
            </p>
            <p>
              If your group prefers to play with open predictions, the <strong>group owner</strong> can
              enable <em>Show picks before kickoff</em> in the group settings (the ⚙ Manage button).
              When turned on, everyone in the group can see each other's predictions before the match starts.
            </p>
          </Section>

          {/* History */}
          <Section title="7. Round history">
            <p>
              Switch to the <strong>Played</strong> tab in your group to see all past rounds.
              Expand a round, then tap any match to see what every member predicted and how many
              points they scored.
            </p>
          </Section>

          {/* Tips */}
          <Section title="Tips">
            <ul className="list-disc space-y-1.5 pl-5 text-foreground/80">
              <li>Submit all your predictions early — life happens and kickoffs sneak up on you.</li>
              <li>Use your Joker on a match with a clear favourite, not a coin-flip.</li>
              <li>Watch the standings closely — a single exact score can flip the table.</li>
              <li>
                You can copy your predictions to other groups playing the same league using the
                <strong> Copy picks</strong> button in the group header.
              </li>
            </ul>
          </Section>

          {/* Contact */}
          <Section title="Questions?">
            <p>
              Reach us at{" "}
              <a href="mailto:contact@scoriq.app" className="text-primary underline underline-offset-2">
                contact@scoriq.app
              </a>
              .
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}
