import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ScorIQ" },
      { name: "description", content: "ScorIQ Privacy Policy — how we collect, use, and protect your data." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <img src="/logo.png" alt="ScorIQ" className="h-8 w-8 object-contain" />
        </div>

        <h1 className="font-display text-4xl leading-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: 25 June 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-3 font-display text-xl">1. Who we are</h2>
            <p>
              ScorIQ ("we", "us", "our") is a private football prediction service operated for personal,
              non-commercial enjoyment. The app is available at{" "}
              <span className="font-medium">scoriq.app</span>.
            </p>
            <p className="mt-2">
              Questions about this policy can be sent to{" "}
              <a href="mailto:contact@scoriq.app" className="text-primary underline underline-offset-2">
                contact@scoriq.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">2. Data we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-semibold">Account information</span> — your name and email address,
                provided either directly during sign-up or via Google Sign-In.
              </li>
              <li>
                <span className="font-semibold">Profile information</span> — optional display name,
                country, and avatar photo that you choose to add.
              </li>
              <li>
                <span className="font-semibold">Prediction data</span> — the score predictions you submit
                for football matches.
              </li>
              <li>
                <span className="font-semibold">Usage data</span> — standard server logs (IP address,
                browser type, pages visited) retained briefly for security and debugging.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">3. How we use your data</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and maintain your account.</li>
              <li>To display your predictions and leaderboard position within your groups.</li>
              <li>To send transactional emails related to your account (e.g. password reset).</li>
              <li>To improve the service and diagnose technical issues.</li>
            </ul>
            <p className="mt-3">
              We do <span className="font-semibold">not</span> sell, rent, or share your personal data with
              third parties for advertising or marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">4. Google Sign-In</h2>
            <p>
              If you sign in with Google, we receive your name, email address, and profile picture from
              Google. We use this information only to create and identify your ScorIQ account. We do not
              request access to your Gmail, contacts, calendar, or any other Google service.
            </p>
            <p className="mt-2">
              Google's own privacy policy applies to the data they process:{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                policies.google.com/privacy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">5. Data storage &amp; security</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Account and prediction data is stored in a Cloudflare D1 database hosted within the
                European Union.
              </li>
              <li>
                Avatar images are stored in DigitalOcean Spaces (Frankfurt region, EU).
              </li>
              <li>
                The app is served via Cloudflare Pages. Cloudflare may process request metadata
                (IP addresses, headers) as part of delivering the service.
              </li>
              <li>
                Football fixture data is fetched from{" "}
                <a
                  href="https://www.football-data.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  football-data.org
                </a>{" "}
                and stored centrally; no personal data is sent to this service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">6. Your rights</h2>
            <p>You may at any time:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Request a copy of the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href="mailto:contact@scoriq.app" className="text-primary underline underline-offset-2">
                contact@scoriq.app
              </a>{" "}
              from the address associated with your account. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">7. Cookies &amp; local storage</h2>
            <p>
              We use a session cookie to keep you logged in. No third-party tracking or advertising
              cookies are set. We use <code className="rounded bg-muted/40 px-1">localStorage</code> only
              to remember your theme preference (light/dark mode).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">8. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be noted by updating
              the effective date above. Continued use of ScorIQ after a change constitutes acceptance
              of the updated policy.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <span className="mx-3">·</span>
          <Link to="/" className="hover:text-foreground">Back to ScorIQ</Link>
        </div>
      </div>
    </div>
  );
}
