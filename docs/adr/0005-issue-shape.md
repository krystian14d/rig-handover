# 0005 · What every issue carries

- Status: accepted · 2026-11-03
- Amends: 0002 (work is issues), styleguide (`closes #n`)

## Context

ADR 0002 says each issue has its source section, scope, a done condition and what it's blocked
by, but not how to write them. For the morning-digest plan the shape was agreed in chat, so the
next split would have had to agree it again. Two things also went wrong with it:

- `closes #n` in a commit closes the issue when it lands on main, without the closing comment
  AGENTS.md requires and before anyone checks "Done when".
- The preview issue was closed when its link was sent. The reviewer hadn't looked yet, and the
  clean-up depended on that look.

## Decision

Every issue split from a plan is written like this, in this order:

```md
Source: plan.md § <n>

## Scope
<what this unit of work changes, and what it leaves to other issues>

## Done when
<the plan's own "Done when", word for word>

## Blocked by
<#n, or —; add "(checking Done when needs #m)" when it can start earlier than it can finish>

## Suggested model
<strongest for logic, cheaper for views and tests (AGENTS.md)>

## Closing
<the closing comment from AGENTS.md>
```

- The first line of the body is exactly `Source: plan.md § <n>`, nothing before it. `<n>` is the
  plan's own numbering: `1`, `2a`, `3`. Two issues may share a section.
- Label: `plan:<plan>` from the plan's frontmatter, e.g. `plan:morning-digest`.
- Title: the plan heading it comes from, plus the route or file when that helps.
- Commits say `refs #n`, never `closes #n`. The worker closes the issue with the comment.
- **Waiting on someone else.** When "Done when" depends on another party (a reviewer looks, a
  reply comes), the issue stays open until their sign shows (their reply, a comment, a page),
  not when we send. Leave a comment saying what it waits on. Issues blocked by it stay blocked.
- The closing comment's `worker:` line names the exact model id, e.g.
  `claude-code · claude-sonnet-5-5 · default`, so the cost per kind of task can be compared.

## Consequences

- `plan-to-issues` step 4 has its answer here; ask the human only about anything beyond it.
- A split someone else made can be checked against one page.
