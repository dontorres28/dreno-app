import LegalPage, { L } from '../../components/LegalPage';
import { LEGAL } from '../../legal/config';

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These Terms govern your use of Dreno (the "Service"), operated by <strong><L v={LEGAL.companyName} /></strong>. By creating an account you agree to these Terms.</p>

      <h2>1. What Dreno is</h2>
      <p>Dreno is a marketplace connecting athletes ("Athletes") with independent mental performance coaches ("Coaches") for one-on-one sessions. Dreno provides the software, booking, and payment infrastructure. <strong>Coaches are independent professionals, not employees of Dreno.</strong> Coaching is not medical or psychological care; if you need clinical support, contact a licensed provider.</p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 16 years old to create an account. If you are under 18, a parent or legal guardian must consent to your use of the Service and any bookings on your behalf.</p>

      <h2>3. Accounts</h2>
      <ul>
        <li>Keep your login credentials confidential; you are responsible for activity under your account.</li>
        <li>The information you give at signup and onboarding must be accurate.</li>
        <li>Coaches are subject to additional verification, including a coaching-certificate review. Dreno may reject or remove Coaches at its sole discretion.</li>
      </ul>

      <h2>4. Bookings and payments</h2>
      <ul>
        <li>Session prices are set by the Coach and shown before you book.</li>
        <li>Payments are processed by our payment provider; Dreno never stores your full card details.</li>
        <li>Refund and cancellation terms are set out in the <a href="/legal/refunds">Refund Policy</a>.</li>
        <li>Dreno charges a platform fee, disclosed to Coaches on onboarding.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to: harass or abuse other users; misrepresent your identity or credentials; reverse-engineer or scrape the Service; use the Service for anything unlawful; upload content you do not have rights to.</p>

      <h2>6. Content you provide</h2>
      <p>You keep ownership of journal entries, goals, messages, and other content you upload. You grant Dreno a limited licence to store and process that content solely to operate the Service for you. See the <a href="/legal/privacy">Privacy Policy</a> for details.</p>

      <h2>7. Disclaimers</h2>
      <p>The Service is provided <strong>"as is"</strong>. Dreno does not guarantee any specific athletic, mental health, or performance outcome. Coaches are independent, Dreno is not liable for the advice, methods, or conduct of any Coach, though we take verification seriously and act on reported misconduct.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the fullest extent permitted by law, Dreno's aggregate liability for any claim arising out of the Service is limited to the amount you paid to Dreno in the six months before the claim arose. Dreno is not liable for indirect, consequential, or incidental damages.</p>

      <h2>9. Termination</h2>
      <p>You may delete your account at any time from Settings. Dreno may suspend or terminate accounts that breach these Terms.</p>

      <h2>10. Changes</h2>
      <p>We will notify you by email of material changes to these Terms at least 14 days before they take effect. Continued use after that constitutes acceptance.</p>

      <h2>11. Governing law</h2>
      <p>These Terms are governed by the law of <strong><L v={LEGAL.jurisdiction} /></strong>, and disputes fall under the exclusive jurisdiction of its competent courts, subject to any mandatory consumer-protection rights in your country of residence.</p>

      <h2>12. Contact</h2>
      <p>{LEGAL.companyName ? <L v={LEGAL.companyName} /> : null}, <L v={LEGAL.companyAddress} />, <L v={LEGAL.registryInfo} />, <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></p>
    </LegalPage>
  );
}
