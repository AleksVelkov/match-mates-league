import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ScorIQ" },
      { name: "description", content: "ScorIQ Terms of Service — the rules of the game." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <img src="/logo.png" alt="ScorIQ" className="h-8 w-8 object-contain" />
        </div>

        <h1 className="font-display text-4xl leading-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective date: 25 June 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-3 font-display text-xl">1. Acceptance</h2>
            <p>
              By creating an account or using ScorIQ ("the Service"), you agree to these Terms of Service.
              If you do not agree, do not use the Service. These terms apply to all users including
              group owners and members.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">2. What ScorIQ is</h2>
            <p>
              ScorIQ is a private football score prediction platform. You and your friends form groups,
              predict match scores for real football competitions, and earn points based on accuracy.
            </p>
            <p className="mt-2">
              ScorIQ is <span className="font-semibold">not</span> a gambling, betting, or real-money
              platform. No money changes hands through the Service. All competition is for entertainment
              only.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">3. Eligibility</h2>
            <p>
              You must be at least 13 years old to use the Service. By registering, you confirm that
              you meet this age requirement. Users under 18 should have parental consent.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">4. Your account</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must provide accurate information when creating your account.</li>
              <li>You may not share your account with others or create accounts on behalf of others.</li>
              <li>
                You may not create multiple accounts to gain an unfair advantage in prediction groups.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to reverse-engineer, scrape, or interfere with the Service.</li>
              <li>Upload content (including avatar images) that is offensive, illegal, or infringes
                third-party rights.</li>
              <li>Manipulate prediction scores or exploit bugs to gain an unfair advantage.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">6. Content you upload</h2>
            <p>
              You retain ownership of content you upload (such as avatar photos). By uploading content
              you grant us a non-exclusive, royalty-free licence to store and display it within the
              Service. You are responsible for ensuring you have the right to upload any content.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">7. Football data</h2>
            <p>
              Match fixtures and results are sourced from{" "}
              <a
                href="https://www.football-data.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                football-data.org
              </a>. We make reasonable efforts to ensure accuracy but cannot guarantee that fixture
              times, results, or other data are always correct or up to date. Points and standings
              are calculated based on the data available to us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">8. Service availability</h2>
            <p>
              We aim to keep ScorIQ available but do not guarantee uninterrupted access. The Service
              is provided on an "as is" basis. We may modify, suspend, or discontinue features at any
              time without notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">9. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, ScorIQ and its operators are not liable for any
              indirect, incidental, or consequential damages arising from your use of the Service.
              Our total liability for any claim is limited to the amount you paid us in the 12 months
              preceding the claim (which is €0 for a free service).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">10. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these terms. You may delete your
              account at any time by contacting us at{" "}
              <a href="mailto:contact@scoriq.app" className="text-primary underline underline-offset-2">
                contact@scoriq.app
              </a>. On termination, your prediction data and group memberships will be removed.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">11. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link to="/privacy-policy" className="text-primary underline underline-offset-2">
                Privacy Policy
              </Link>
              , which is incorporated into these terms by reference.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">12. Governing law</h2>
            <p>
              These terms are governed by the laws of the Republic of North Macedonia, without regard
              to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl">13. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Continued use of ScorIQ after changes are
              posted constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
          <span className="mx-3">·</span>
          <Link to="/" className="hover:text-foreground">Back to ScorIQ</Link>
        </div>
      </div>
    </div>
  );
}
