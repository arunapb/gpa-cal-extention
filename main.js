// ===== main.js =====
// Runs last (after core/engine.js and every adapters/*.js have loaded
// and self-registered into window.GPAAdapters). Finds the first
// adapter whose `matches()` fits the current page, creates one fresh
// engine instance, and hands control to that adapter.
//
// To add a new university later: write adapters/newuni.js following
// the same self-registering pattern, add its filename + its URL match
// pattern to manifest.json. Nothing in this file changes.

(function () {
  const adapters = window.GPAAdapters || [];
  const adapter = adapters.find((a) => {
    try {
      return a.matches(window.location);
    } catch (e) {
      console.warn("[GPA Extension] adapter matches() threw:", a.id, e);
      return false;
    }
  });

  if (!adapter) return; // no adapter recognizes this page - do nothing

  const engine = window.GPAEngine.createEngine();
  try {
    const handled = adapter.run(engine);
    if (handled === false) {
      // Expected, not an error: many pages under the site's ?d=...
      // pattern (dashboard, My Requests sub-pages, etc.) share the
      // adapter's URL match but simply have no results table to find.
      console.debug(
        `[GPA Extension] Adapter "${adapter.id}" matched the URL but found no results table on this page (likely not a results view).`,
      );
    }
  } catch (e) {
    console.error(`[GPA Extension] Adapter "${adapter.id}" threw an error:`, e);
  }
})();
