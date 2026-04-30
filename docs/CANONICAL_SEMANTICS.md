# Canonical Semantic Keys (Do Not Drift)

This project uses fixed semantic slots for the five top-level pages.

- `about`
- `products`
- `solutions`
- `finance`
- `contact`

Hard rule:

- The financing semantic key is always `finance`.
- Canonical routes are:
  - `zh`: `/zh/finance`
  - `en`: `/en/finance`
- Any old `*-solutions` style URL is legacy and must not be used for new content.

When editing Keystatic `key` or `href`, always map to these canonical semantics first.
