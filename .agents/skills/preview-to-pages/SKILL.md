---
name: preview-to-pages
description: Put a rig page online as a public preview for a reviewer with GitHub Pages (Actions artifact, never committed), check it like a stranger, keep its issue open until the reviewer has looked, then upload it again over the same link without the lane marker. Use for a plan's "Preview for review" and "Clean up" sections.
---

# preview-to-pages

ADR 0003: a preview is one HTML file on a public host, never in the repo, issues or chat, and it
loses its lane marker once its review is in. Here the host is GitHub Pages for this repo,
deployed by `.github/workflows/preview.yml` from a build artifact, so nothing marked is ever
committed and the clean-up uploads over the same link.

The workflow runs rig, saves the page with `curl` (a command, not "save as"), and deploys it. The
marker comes from the repo secret `LANE_MARKER`; input `with_marker=false` leaves it unset, so the
banner reads "no marker set". To preview another page, change the `curl` path in the workflow.

## Ask first

Every step below that reaches GitHub is an outside action. Ask the human before each group, and
say what, where, who can see it and how to undo it:

1. first upload: push the workflow, set the secret, turn Pages on, run with the marker;
2. clean-up upload: run without the marker, delete the secret.

## Needs

- `gh` signed in to the repo owner's account with the `workflow` scope (pushing a workflow file
  needs it). Check: `gh api -i user | grep -i x-oauth-scopes`.
- The page renders locally: `pnpm start`, then `curl -s localhost:8787/<path>`.

## First upload

```sh
R=<owner>/<repo>
grep '^LANE_MARKER=' .env | cut -d= -f2 | tr -d '\n' | gh secret set LANE_MARKER -R $R
gh api -X POST repos/$R/pages -f build_type=workflow -q .html_url   # once per repo
gh workflow run preview.yml -R $R -f with_marker=true
gh run watch <run id> -R $R --exit-status
```

## Check it like a stranger

Before you send the link, fetch it with no sign-in, from the shell, not from a signed-in browser:

```sh
U=https://<owner>.github.io/<repo>/
curl -s -o /tmp/pv.html -w '%{http_code}\n' "$U?v=$(date +%s)"   # 200
grep -o 'class="marker">[^<]*' /tmp/pv.html                       # the marker
grep -c '<script' /tmp/pv.html                                    # 0 (ADR 0001)
```

Also check the rows you expect are there. Pages caches for up to 10 minutes
(`cache-control: max-age=600`): a query string gets the fresh copy.

## Send, then wait

Send the reviewer the link and the issues. The preview issue's "Done when" holds when the
**reviewer has looked**, not when the link is sent (ADR 0005). Leave it open with a comment saying
what it waits on, keep the marked page up, and close it only when the reviewer's sign shows.
The clean-up is blocked by it: don't take the marker off before the review is in.

## Clean up

```sh
gh workflow run preview.yml -R $R -f with_marker=false
gh run watch <run id> -R $R --exit-status
curl -s "$U?v=$(date +%s)" | grep -o 'class="marker">[^<]*'   # no marker set
curl -s "$U" | grep -c '<marker value>'                        # 0, also without the query string
gh secret delete LANE_MARKER -R $R
```

Then move the plan to `docs/plans/done/` with its issue list and close the clean-up issue.

## Undo

Turn Pages off (`gh api -X DELETE repos/$R/pages`) or delete the repo. Both remove the link.

## Don'ts

- Don't serve the preview from a branch or `docs/` folder: that commits it, marker and all.
- Don't print the page or the marker in the workflow log; `curl -o` writes the file quietly.
- Don't send the link before the stranger check passes.
