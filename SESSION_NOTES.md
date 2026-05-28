# Rhinowiki Session Notes
_Last updated: 2026-05-28_

## What this project is
Rhinowiki is a personal Clojure blog engine. It serves Markdown articles stored
either in a Git repo or on the filesystem, renders them via the `markdown-clj`
library with syntax highlighting via an embedded GraalVM JS context running
highlight.js, and serves them with Compojure/Jetty/Ring. Feeds (Atom + RSS) are
also generated.

## Source layout
```
src/rhinowiki/
  main.clj                   -- entry point, wires blog atom + webserver
  utils.clj                  -- shared helpers (get-version, resource-path,
                                 thread-safe-date-format, format-date, parse-date)
  blog/
    blog.clj                 -- blog data model, cache, article lookup
    parser.clj               -- Markdown → HTML, metadata parsing, image rewriting
    highlight.clj            -- GraalVM JS context wrapping highlight.js
  site/
    webserver.clj            -- Jetty startup, middleware stack
    routes.clj               -- top-level route assembly
    pages.clj                -- HTML page handlers + blog routes
    feeds.clj                -- Atom + RSS feed generation
    toplevel_page.clj        -- shared site chrome (header/footer/html5 shell)
    error_handling.clj       -- /error and 404 routes
  store/
    core.clj                 -- StoreFile + Store protocols
    store.clj                -- dispatch (file vs git), load-one, load-all-public
    file.clj                 -- filesystem-backed store
    git.clj                  -- JGit-backed store
resources/config.edn         -- default configuration
```

## Changes made this session

### 1. Thread-safe date formatting (bug fix)
`java.text.SimpleDateFormat` is not thread-safe. Bare module-level `def`s were
shared across Jetty request threads, risking corrupted parse/format output under
concurrent load.

**Fix:** Added `thread-safe-date-format` to `utils.clj` — backs each formatter
with a `ThreadLocal<SimpleDateFormat>` via `proxy`. Returns a map of
`{:format fn :parse fn}`. Added `format-date` and `parse-date` helpers.

Updated all call sites:
- `parser.clj` — `df-metadata` def + `maybe-parse-metadata-date`
- `blog.clj` — `parse-date-format` (creates formatters stored in `:date-format`)
- `pages.clj` — two `.format` calls on `:date-format` entries
- `feeds.clj` — `df-atom-rfc3339`, `df-rss-rfc822` defs + four `.format` calls

### 2. Secured `/invalidate` POST endpoint
The `POST /invalidate` route had no authentication — anyone could trigger a full
blog reload. Fixed in `pages.clj`:

- Reads `X-Invalidate-Token` request header
- Compares to `:invalidate-token` from config
- Returns 403 if token is missing, not configured, or doesn't match
- **Bypassed entirely when `:development-mode` is true** (consistent with how
  the `?invalidate=true` query param is already gated)

Added `:invalidate-token nil` to `resources/config.edn` with a comment.
Set the real token in deployment-specific `local-config.edn` (not committed).

To wire up in GitHub: add a custom header `X-Invalidate-Token: <secret>` on the
webhook. GitHub's webhook UI supports arbitrary custom headers.

## Outstanding issues from the security/performance assessment

### Security
- **Private articles accessible via direct URL** (medium) — `:private` flag
  only filters listing pages; `article-by-name` returns private articles to
  anyone who knows the URL. Fix: check `:private` in `article-page`, or exclude
  from `articles-by-name` at build time.
- **`tag=private` leaks private listings** (medium) — `blog-display-articles`
  skips the private filter when `tag` equals `"private"`. May be intentional.
- **GraalVM `allowAllAccess true`** (medium) — JS context has full host access.
  Scope it with an explicit `HostAccess` policy.
- **Highlight errors expose file paths to users** (low) — error strings with
  internal paths are rendered into HTML. Log them; show a generic message.
- **No HTTP security headers** (low) — no CSP, X-Frame-Options, etc.
- **Author email in RSS feeds** (low/info) — exposed in managingEditor/webMaster.

### Performance
- **Git store re-walks tree on every `catalog` call** (high) — `GitStore/-catalog`
  opens the repo and walks the full tree each time. `load-one` (used for image
  dimensions during Markdown rendering) calls `catalog`, so each image in an
  article triggers a full git tree walk. Cache the catalog inside `GitStore`.
- **`load-one` is O(n) linear scan** (medium) — should use the existing
  `files-by-name` map from `data-files` instead of scanning the store.
- **Single-threaded syntax highlighting** (medium) — GraalVM context is protected
  by `locking`; all highlighting is serial. A small pool of contexts would
  allow concurrent highlighting.
- **`wrap-not-modified` imported but not wired** (low) — imported in
  `webserver.clj` but absent from the middleware chain; no 304 responses for
  HTML pages.
- **Feed XML re-serialized on every request** (low) — `xml/indent-str` runs on
  every feed hit; rendered feed could be cached and invalidated with the blog.
- **Double deref of `blog-ref` in "/" route** (info) — bind once with `let`.
