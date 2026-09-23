import LegalPage from '../../components/LegalPage';

export default function Cookies() {
  return (
    <LegalPage title="Cookie Policy">
      <p>Dreno stores a small number of items in your browser to make the Service work. Under EU/UK ePrivacy rules, <strong>we do not need a consent banner today</strong> because everything we store is either strictly necessary for the Service or a preference you set yourself. If we later add analytics, marketing, or advertising trackers, we will introduce a proper consent banner before turning them on.</p>

      <h2>What we store, and why</h2>
      <ul>
        <li><strong>Authentication (Supabase, <code>sb-*</code>)</strong> — keeps you signed in. Strictly necessary. Cleared when you sign out.</li>
        <li><strong>Theme (<code>dreno-theme</code>)</strong> — remembers whether you chose light or dark. Preference set by you.</li>
        <li><strong>Language (<code>dreno-lang</code>)</strong> — remembers your language pick. Preference set by you.</li>
      </ul>

      <h2>What we do not use</h2>
      <ul>
        <li>Google Analytics, Meta Pixel, TikTok Pixel, LinkedIn Insight, or any advertising tracker.</li>
        <li>Third-party session-replay tools (Hotjar, FullStory, Clarity).</li>
        <li>Cross-site tracking cookies of any kind.</li>
      </ul>

      <h2>Controlling your browser storage</h2>
      <p>You can clear cookies and site data from your browser settings at any time. If you clear our storage, you will be signed out and your theme/language will reset to defaults.</p>
    </LegalPage>
  );
}
