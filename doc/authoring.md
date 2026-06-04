# Rhinowiki: Authoring Guide

Rhinowiki serves content from a directory or git repository. This guide
covers how to structure that content, write articles, and use the
features available in article markup.

## Content Repository Structure

A content repository is a directory (or git repo) containing Markdown
files and any static assets you want to serve. There are no required
subdirectories, but every repository must include one special location:

```
_private/config.edn     ← required site configuration (not served publicly)
index.md                ← optional: shown at the site root instead of the article list
your-article.md         ← articles
images/photo.jpg        ← static files (images, etc.)
```

Anything under `_private/` is never served to browsers. Everything else
is fair game for public access.

## Site Configuration (`_private/config.edn`)

Each content repository requires a `_private/config.edn` file. This
configures how the site presents itself.

### Minimal example

```edn
{:base-url "https://blog.example.com"
 :title    "My Blog"
 :author   "Jane Smith"
 :email    "jane@example.com"
 :namespace #uuid "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
```

Generate the `:namespace` UUID once with any UUID generator and never
change it — it is used to produce stable, unique IDs for your RSS/Atom
feeds.

### Full reference

| Key | Description |
|-----|-------------|
| `:base-url` | Canonical URL of the site, e.g. `"https://blog.example.com"`. Used in permalinks and feeds. |
| `:title` | Site title, shown in the header and browser tab. |
| `:subtitle` | Optional subtitle shown below the site title. |
| `:author` | Author name, used in RSS/Atom feeds. |
| `:email` | Author email, used in RSS/Atom feed metadata. |
| `:copyright` | Copyright notice shown in the footer. |
| `:language` | BCP 47 language tag, e.g. `"en-US"`. Defaults to `"en-US"`. |
| `:namespace` | A UUID used to generate stable blog and article IDs. Generate once and never change. |
| `:stylesheet` | Path (relative to the content root) to a custom CSS file, e.g. `"custom.css"`. |
| `:header-links` | List of links shown in the site header (see below). |
| `:sponsors` | Map of sponsor keys to sponsor info (see below). |
| `:redirects` | Map of old URL paths to new targets for server-side redirects. |

### Header links

The `:header-links` list populates a navigation area in the site header.
Each entry can display either a text label or a Font Awesome icon:

```edn
:header-links [{:link "/about"           :label "About"}
               {:link "https://github.com/you"
                :fa-icon "fa-github"
                :label "GitHub"}]
```

External links (those not starting with `/`) open in a new tab with
`rel="noopener noreferrer"` automatically applied.

### Sponsors

The `:sponsors` map lets you attach sponsor attribution to individual
articles. The key is an arbitrary string you reference in article
front matter.

```edn
:sponsors {"acme" {:long-name  "Acme Corporation"
                   :short-name "Acme"
                   :link       "https://acme.example.com"}}
```

### Redirects

Use `:redirects` to send old URLs to new locations. The key is the path
(without the leading `/`), and the value is the destination.

```edn
:redirects {"old-page" "/new-page"
            "rss.xml"  "/feed/rss"}
```

For per-article redirects, see `redirect-from:` in article front matter.

## Writing Articles

Articles are Markdown files with a `.md` extension. The filename (without
`.md`) becomes the article's URL path. For example, `my-first-post.md`
is served at `/my-first-post`.

You can also place an article at `topic/my-post.md` and it will be served
at `/topic/my-post`.

### Front matter

Every article can begin with metadata headers in the format `key: value`,
one per line, before any blank line or body content:

```markdown
title: My First Post
date: 2024-03-15
tags: clojure programming
```

Available front matter keys:

| Key | Description |
|-----|-------------|
| `title:` | Article title. Defaults to the filename if omitted. |
| `date:` | Publication date in `YYYY-MM-DD` format. Articles without a date don't appear in listings. |
| `tags:` | Space-separated list of tags. |
| `private: true` | Hides the article from all listings and the table of contents. It remains accessible via its direct URL. |
| `page: true` | Treats the article as a standalone page rather than a blog post — no date is shown, and it is excluded from all listings. |
| `redirect-from:` | Space-separated list of old paths that should redirect here (useful when renaming articles). |
| `sponsor:` | A key from the `:sponsors` map in `_private/config.edn`. Displays a sponsor attribution block on the article. |

### Body content

After the front matter (and a blank line, if any), write standard
Markdown. Rhinowiki supports:

- CommonMark Markdown including headers, lists, blockquotes, and tables
- Fenced code blocks with language-specific syntax highlighting
- Footnotes (`[^1]` / `[^1]: ...`)
- Reference-style links

### Syntax highlighting

Specify the language in a fenced code block for highlighted output:

````markdown
```clojure
(defn hello [name]
  (println (str "Hello, " name "!")))
```
````

### Article summaries and "Read More"

By default, the article list shows each post in full. To show only a
teaser on the list page with a "Read More" link to the full article,
insert `<!--more-->` at the fold point:

```markdown
title: My Long Post
date: 2024-03-15

This paragraph appears in the article list as the summary.

<!--more-->

This paragraph and everything after it only appears on the full article page.
```

### Images

Reference images with standard Markdown syntax:

```markdown
![Alt text](images/photo.jpg)
```

Relative paths are resolved relative to the article file's location.
Absolute paths (starting with `/`) are resolved from the content root.
External URLs (`http://` or `https://`) are left as-is.

Image dimensions are read from local image files and injected as `width`
and `height` attributes automatically, which helps prevent layout shifts
during page load.

### External links

Links written with the `!ext:` prefix are routed through Rhinowiki's
redirect system and rendered with `rel="nofollow noopener noreferrer"`:

```markdown
Check out [this resource](!ext:https://example.com/article).
```

The link resolves to a `/go/<slug>` URL that redirects to the target.
This is useful for outbound links where you want referrer hygiene or
to keep link tracking off your readers.

## Special Files

**`index.md`** — If this file exists at the root of the content
repository, it is displayed at the site root (`/`) instead of the
default article list. Use it for a custom homepage or landing page.
Typically written with `page: true` in its front matter.

**`_private/config.edn`** — Required site configuration, described
above. This file (and anything else under `_private/`) is never served
to browsers.

## URL Structure

| URL | Content |
|-----|---------|
| `/` | `index.md` if it exists, otherwise recent articles |
| `/blog` | Recent articles list (paginated) |
| `/blog?tag=clojure` | Articles filtered by tag |
| `/blog?start=4` | Articles starting at offset 4 (for pagination) |
| `/contents` | Full table of contents |
| `/feed/atom` | Atom feed |
| `/feed/rss` | RSS feed |
| `/feed/atom?tag=clojure` | Tag-filtered Atom feed |
| `/<article-name>` | Individual article |
| `/<path/to/file>` | Static file (image, CSS, etc.) |

## Working with Git

When the site is hosted from a git backend, Rhinowiki reads from the
HEAD commit of the configured branch. Your workflow is:

1. Write and edit files locally (using the `:file` backend for fast
   iteration with development mode enabled).
2. Commit your changes.
3. Push to the remote repository that the server reads from.
4. Trigger a cache invalidation so the server picks up the new content
   (typically via a `POST /invalidate` request or a git post-receive hook).

Content in uncommitted changes is not visible when using the git backend;
only committed content in the configured branch is served.

## Tags and Private Content

Tags let readers browse related articles. Add them to any article with
`tags: tag1 tag2` in the front matter. Tag pages are available at
`/blog?tag=tagname`.

The special tag `private` (or `private: true` in front matter) marks an
article as hidden from all listings. Private articles are still
accessible via their direct URL, making them useful for draft content or
pages you want to share selectively without publishing broadly.
