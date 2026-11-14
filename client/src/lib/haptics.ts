// Haptic ticks for the cognitive tests. navigator.vibrate is Android/Chrome
// only and no-ops elsewhere, so every call is guarded and silent on failure.
// Three intents, matched to the physicality of the moment (Apple's causality
// rule: the feedback fires on the real event, with a character that fits it).
function buzz(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

export const haptics = {
  tap: () => buzz(10),        // a registered press — the lightest tick
  go: () => buzz(18),         // the stimulus appears / the moment to act
  ok: () => buzz([14, 40, 14]), // a result lands, a level clears
  warn: () => buzz([40, 30, 40]), // too early, a false alarm
}
