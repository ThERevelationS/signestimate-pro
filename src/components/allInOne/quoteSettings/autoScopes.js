// Auto-scope engine for the customer quote.
// A QuoteScopeLine is auto-applied when it is flagged always_include, or when
// its auto_modules list contains a module key that has a section on this
// estimate. Lines are merged into the newline-separated scope text without
// creating duplicates and without removing anything the estimator typed.

export const scopeLines = (text) =>
  (text || "").split("\n").map((l) => l.trim()).filter(Boolean);

export const scopeText = (lines) => lines.join("\n");

export const projectModuleKeys = (project) =>
  new Set((project?.line_items || []).filter((li) => !li.missing).map((li) => li.module_key));

/** Library lines that should be auto-applied to this estimate, by kind. */
export function autoScopeMatches(project, library, kind) {
  const keys = projectModuleKeys(project);
  return (library || []).filter(
    (l) =>
      l.kind === kind &&
      l.is_active !== false &&
      (l.always_include || (l.auto_modules || []).some((k) => keys.has(k)))
  );
}

/** Adds the given texts to an existing scope block, skipping duplicates. */
export function mergeScope(existingText, texts) {
  const current = scopeLines(existingText);
  const seen = new Set(current.map((l) => l.toLowerCase()));
  const added = [];
  texts.forEach((t) => {
    const clean = (t || "").trim();
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    added.push(clean);
  });
  return { text: scopeText([...current, ...added]), addedCount: added.length };
}

/** Applies both auto-scope lists, returning only the fields that changed. */
export function applyAutoScopes(project, library) {
  const inc = mergeScope(project.scope_inclusions, autoScopeMatches(project, library, "inclusion").map((l) => l.text));
  const exc = mergeScope(project.scope_exclusions, autoScopeMatches(project, library, "exclusion").map((l) => l.text));
  const patch = {};
  if (inc.addedCount) patch.scope_inclusions = inc.text;
  if (exc.addedCount) patch.scope_exclusions = exc.text;
  return { patch, addedCount: inc.addedCount + exc.addedCount };
}