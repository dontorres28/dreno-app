import LegalPage from '../../components/LegalPage';

export default function Refunds() {
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <p>Dreno sells one-on-one sessions with independent coaches. Because sessions are personal time booked in advance, refund terms depend on when and why a session is cancelled.</p>

      <h2>Athlete cancellations</h2>
      <ul>
        <li><strong>More than 24 hours before the session:</strong> full refund, automatic.</li>
        <li><strong>Less than 24 hours before the session:</strong> no refund. You can reschedule once with the same coach if they have availability.</li>
        <li><strong>You do not show up:</strong> no refund.</li>
      </ul>

      <h2>Coach cancellations or no-shows</h2>
      <p>Full refund, automatic, plus a credit toward your next booking as a good-faith gesture.</p>

      <h2>Session did not happen for technical reasons</h2>
      <p>If a Dreno-side technical failure (video room down, payment glitch) prevented the session, contact support and we will refund or reschedule at your choice.</p>

      <h2>Session quality complaints</h2>
      <p>We take these seriously. Contact support within 7 days of the session with a description of what went wrong. We investigate every complaint; if we determine the coach materially failed to deliver, we refund fully. This is separate from any statutory rights you have under consumer-protection law where you live.</p>

      <h2>Statutory rights (EU/EEA/UK/CH consumers)</h2>
      <p>You may have a 14-day right of withdrawal for online services. This right ends once a session has been fully performed, and you acknowledge this by booking a session that starts inside the 14-day window.</p>

      <h2>How to request a refund</h2>
      <p>From your dashboard, open the booking and choose "Cancel" (auto refund if eligible), or email support with your booking ID for edge cases.</p>
    </LegalPage>
  );
}
