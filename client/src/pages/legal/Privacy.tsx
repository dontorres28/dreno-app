import LegalPage, { L } from '../../components/LegalPage';
import { LEGAL } from '../../legal/config';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p><strong><L v={LEGAL.companyName} /></strong> (the "controller") operates Dreno. This Policy explains what personal data we process, why, and your rights under the EU/UK GDPR and the Swiss FADP.</p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account:</strong> email, hashed password (or OAuth identifier from Google/Apple), name, role (athlete/coach/admin).</li>
        <li><strong>Athlete profile:</strong> sport, competition level, country, date of birth, timezone, session-format preference, languages, self-reported challenges.</li>
        <li><strong>Coach profile:</strong> professional details, coaching certificate uploaded during onboarding.</li>
        <li><strong>Product use:</strong> drill results, journal entries, goals, session notes, messages between you and your coach.</li>
        <li><strong>Payments:</strong> handled by our payment processor; we store transaction IDs and amounts, never full card details.</li>
        <li><strong>Technical:</strong> IP address and user agent, kept only as long as needed for security and abuse prevention.</li>
      </ul>

      <h2>2. Why we process it (legal basis)</h2>
      <ul>
        <li><strong>Contract (Art. 6(1)(b) GDPR):</strong> to run your account, deliver sessions, and process payments.</li>
        <li><strong>Legal obligation (Art. 6(1)(c)):</strong> tax, accounting, and record-keeping.</li>
        <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> to secure the Service, prevent fraud, and improve product quality, balanced against your rights.</li>
        <li><strong>Consent (Art. 6(1)(a)):</strong> for anything explicitly optional (e.g. future marketing emails). You can withdraw consent any time.</li>
      </ul>

      <h2>3. Who we share it with</h2>
      <p>We share the minimum required data with these processors, all under a Data Processing Agreement:</p>
      <ul>
        <li><strong>Supabase</strong>, authentication, database, storage (EU region).</li>
        <li><strong>Vercel</strong>, hosting, CDN.</li>
        <li><strong>Google / Apple</strong>, only if you sign in with those providers.</li>
        <li><strong>Coaches you book</strong>, receive your name, session goals, and messages you send them.</li>
        <li>Payment processor (activated when payments launch).</li>
      </ul>
      <p>We do <strong>not</strong> sell your data. We do not use it to train third-party AI models.</p>

      <h2>4. International transfers</h2>
      <p>Data is stored primarily in the EU. Any transfer to a country outside the EU/UK/Switzerland relies on Standard Contractual Clauses or an adequacy decision.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Account and profile data: while your account is active, plus 30 days after deletion.</li>
        <li>Session, journal, and drill data: same as above; you can export or delete earlier from Settings.</li>
        <li>Payment records: retained as long as required by tax law (typically up to 10 years).</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>Under GDPR/FADP you can: access your data; correct it; delete it; export it; restrict or object to processing; withdraw consent; and lodge a complaint with a supervisory authority. Contact <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>, we respond within 30 days.</p>

      <h2>7. Security</h2>
      <p>Data is encrypted in transit (TLS) and at rest. Access is restricted to staff who need it. We use hashed passwords via Supabase's built-in auth.</p>

      <h2>8. Children</h2>
      <p>Dreno is not intended for children under 16. If you believe a child has created an account, contact us and we will delete it.</p>

      <h2>9. Changes</h2>
      <p>We notify you of material changes at least 14 days before they take effect.</p>

      <h2>10. Controller & contact</h2>
      <p><L v={LEGAL.companyName} />, <L v={LEGAL.companyAddress} />, <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></p>
    </LegalPage>
  );
}
