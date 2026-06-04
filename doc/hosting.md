# Rhinowiki: Hosting Guide

Rhinowiki is a blog engine that runs as a single Java process and serves
one or more sites. This guide covers installation, configuration, and
day-to-day operation.

## Requirements

- Java 11 or later
- The `rhinowiki-standalone.jar` from a release build
- A content repository for each site (see [Authoring Guide](authoring.md))

## Installation

The `pkg/` directory contains an install script for Debian/Ubuntu systems:

```sh
sudo ./install.sh
```

This script:

- Creates a dedicated `rhinowiki` system user
- Installs the JAR to `/usr/share/rhinowiki/`
- Creates log and data directories under `/var/log/rhinowiki/` and `/var/lib/rhinowiki/`
- Installs a default config to `/etc/rhinowiki/config.edn`
- Registers a SysV init script so the service starts on boot

After installation, manage the service with the standard init commands:

```sh
sudo service rhinowiki start
sudo service rhinowiki stop
sudo service rhinowiki restart
sudo service rhinowiki status
```

## Server Configuration

The server reads its configuration from `/etc/rhinowiki/config.edn` (or a
path supplied via `-Dconf=...` on the Java command line). This is an
[EDN](https://github.com/edn-format/edn) file — Clojure's data literal
format.

### Minimal example

```edn
{:http-port 8089
 :log-path "/var/log/rhinowiki/rhinowiki.log"

 :sites {"blog.example.com" {:source :git
                              :repo-path "/home/git/blog.git"}}}
```

### Full reference

| Key | Default | Description |
|-----|---------|-------------|
| `:http-port` | `8080` | TCP port Rhinowiki listens on |
| `:log-path` | *(none)* | Path for the log file |
| `:development-mode` | `false` | Enables file watching and live reload (see below) |
| `:sites` | `{}` | Map of hostname → storage spec (required) |
| `:default-site` | `nil` | Fallback hostname when `Host` header doesn't match any entry in `:sites` |
| `:invalidate-token` | `nil` | Secret token for the cache invalidation endpoint |
| `:rhinowiki-repository` | *(built-in)* | URL shown in the page footer |
| `:rss-spec-location` | *(built-in)* | RSS spec URL embedded in feeds |
| `:blog-defaults` | *(built-in)* | Default blog display settings (see below) |
| `:blog-overrides` | `{}` | Values merged into every site's blog config after load |

### Storage specs

Each entry in `:sites` is a map with a `:source` key that selects the
storage backend.

**Git backend** — reads content from the HEAD commit of a bare or
non-bare git repository. This is the recommended backend for production
because content only changes when you push.

```edn
{:source :git
 :repo-path "/home/git/blog.git"   ; path to the repository
 :ref-name "refs/heads/master"     ; branch to read (default: refs/heads/master)
 :article-root ""}                 ; path prefix within the repo (default: root)
```

**File backend** — reads content directly from a directory on disk.
Useful for development or when you want to serve an unversioned folder.

```edn
{:source :file
 :article-root "/home/user/blog"   ; directory to serve
 :exclude-prefix "/home/user/blog/.git"}  ; optional prefix to exclude
```

### Hosting multiple sites

Rhinowiki dispatches requests by the HTTP `Host` header, so you can
serve completely independent sites from a single process:

```edn
{:http-port 8089

 :sites {"blog.example.com"  {:source :git :repo-path "/home/git/blog.git"}
         "notes.example.com" {:source :git :repo-path "/home/git/notes.git"}}

 :default-site "blog.example.com"}
```

`:default-site` is useful for development (e.g. `localhost` requests) or
as a catch-all when the `Host` header doesn't match.

### Blog defaults and overrides

The `:blog-defaults` key sets baseline values that are merged into every
site's `_private/config.edn` before it is used. `:blog-overrides` is
merged after, so it takes precedence over both the defaults and the
per-site config. This is useful for forcing a development `base-url`:

```edn
{:development-mode true
 :blog-overrides {:base-url "http://localhost:8089"}}
```

The built-in defaults are:

```edn
{:recent-post-limit 4
 :feed-post-limit 20
 :contents-post-limit 100

 :date-format {:articles-header "MMMM dd, yyyy"
               :contents-header "MMMM yyyy"
               :article-header  "MMMM d, y"}

 :language "en-US"}
```

## Reverse Proxy Setup

Rhinowiki speaks plain HTTP and is designed to sit behind a reverse
proxy such as nginx that handles TLS termination and security headers.
A sample `nginx-security-headers.conf` is included in `pkg/`.

A minimal nginx location block:

```nginx
location / {
    proxy_pass         http://127.0.0.1:8089;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
}
```

Make sure `proxy_set_header Host $host` is present — Rhinowiki uses the
`Host` header to select the correct site.

## Cache Invalidation

Rhinowiki loads content at startup and caches it in memory. When using
the git backend, the cache must be invalidated after a push for changes
to appear.

Send a `POST` request to `/invalidate` with the secret token:

```sh
curl -X POST https://blog.example.com/invalidate \
     -H "X-Invalidate-Token: your-secret-token"
```

Configure the token in `config.edn`:

```edn
{:invalidate-token "your-secret-token"}
```

If `:invalidate-token` is `nil` (the default), all invalidation requests
are rejected. In `:development-mode`, the token check is bypassed.

A common pattern is to trigger invalidation from a git post-receive hook
on the server so that a `git push` automatically refreshes the site.

## Development Mode

Set `:development-mode true` in your config to enable:

- **File watching** — Rhinowiki watches the content directory for changes
  and automatically reloads when files are created, modified, or deleted.
  This only applies to the `:file` backend.
- **Live reload** — A small JavaScript snippet is injected into every
  page that polls for content changes and triggers a browser reload.
- **Token-free invalidation** — `POST /invalidate` is accepted without a
  token.

A typical local development config:

```edn
{:sites {"blog.example.com" {:source :file
                              :article-root "../my-blog"
                              :exclude-prefix "../my-blog/.git"}}

 :default-site "blog.example.com"
 :development-mode true
 :blog-overrides {:base-url "http://localhost:8080"}}
```

## Logs

Rhinowiki writes structured logs to the path set by `:log-path`, and
also logs to stdout (captured to `rhinowiki-console.log` by the init
script). Check both when diagnosing startup failures.

If a request arrives with a `Host` header that doesn't match any site
and no `:default-site` is configured, Rhinowiki logs a warning and
returns HTTP 421 Misdirected Request.
