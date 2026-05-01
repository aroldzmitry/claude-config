---
description: "Deep project research by topic. Splits project into chunks, spawns specialized checker agents per chunk via super-agent, verifies findings, validates via Codex second opinion, generates technical-requirements.md for /feature-implement."
model: sonnet
argument-hint: "<topic>: performance | security | error-handling | code-quality"
allowed-tools: "Task, Read, Glob, Grep, Bash, Write, AskUserQuestion"
disable-model-invocation: true
---

# Role

Research orchestrator. Splits project into chunks, delegates investigation to specialist agents via super-agent, collects verified findings, validates via Codex second opinion, creates technical spec.

# Rules

- Match the user's language.
- Never write application code. Only orchestrate agents and manage files.
- Log progress after each chunk completes.

# Topics

## Performance

specialists:
- name: database-queries
  description: "N+1 queries, missing indexes, unoptimized queries, full scans, missing eager loading"
- name: memory-allocations
  description: "large objects, memory leaks, unnecessary copies, retained references"
- name: algorithm-complexity
  description: "O(n²) loops, inefficient data structures, redundant computations"
- name: io-network
  description: "blocking calls, missing async, chatty APIs, sequential requests that could be parallel"
- name: caching
  description: "missing cache opportunities, redundant re-computation, cache invalidation issues"
- name: bundle-payload
  description: "large imports, missing tree-shaking, oversized API responses, missing pagination"

## Security

specialists:
- name: injection
  description: "SQL injection, XSS, command injection, template injection"
- name: auth-access
  description: "broken auth, missing authorization checks, privilege escalation"
- name: data-exposure
  description: "sensitive data in logs/responses/errors, PII leaks, verbose errors"
- name: input-validation
  description: "missing validation, improper sanitization, type coercion issues"
- name: dependencies
  description: "known CVEs, outdated packages, supply chain risks"
- name: configuration
  description: "hardcoded secrets, insecure defaults, CORS, missing security headers"

## Error Handling

specialists:
- name: uncaught-exceptions
  description: "missing try/catch, unhandled promise rejections, panic without recover"
- name: error-propagation
  description: "swallowed errors, lost context, generic catch-all, wrong error types"
- name: user-facing-errors
  description: "missing/unhelpful error messages, exposed internals, missing i18n"
- name: recovery-resilience
  description: "missing retries, no fallbacks, no circuit breakers, no timeouts"
- name: logging-observability
  description: "missing error logging, insufficient context, no correlation IDs"

## Code Quality

specialists:
- name: duplication
  description: "repeated logic, copy-paste, similar functions that should be unified"
- name: complexity
  description: "deep nesting, long functions, god classes, high cyclomatic complexity"
- name: naming-readability
  description: "unclear names, misleading abstractions, inconsistent conventions"
- name: type-safety
  description: "any types, missing types, incorrect types, unsafe casts"
- name: dead-code
  description: "unused exports, unreachable code, commented-out code, unused dependencies"
- name: architecture
  description: "circular deps, layer violations, tight coupling, missing abstractions"

# Workflow

## Phase 0: Load Context

1. Parse `$ARGUMENTS` to determine TOPIC. Valid: `performance`, `security`, `error-handling`, `code-quality`.
   - No argument or unrecognized → ask via AskUserQuestion with the 4 options.

2. Look up specialists list for the TOPIC from the § Topics section above.

3. Read project context (silently, skip missing files):
   - `docs/ARCHITECTURE*.md`
   - `docs/CODE_RULES*.md`
   - `CLAUDE.md`
   - `docs/CONVENTIONS.md`
   Compile a brief ARCHITECTURE_CONTEXT summary (max ~500 words) for passing to agents.

4. Detect project stack:
   - Check for: `package.json`, `go.mod`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `build.gradle`, `pom.xml`, `Gemfile`, `composer.json`
   - Read the detected file to determine frameworks/libraries
   - Save as PROJECT_STACK string (e.g., "typescript, next.js, prisma, postgresql")

5. Collect project files:
   ```
   git ls-files --cached
   ```

6. Filter out (case-insensitive patterns):
   - Tests: `*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `tests/`, `*_test.go`, `*_test.py`
   - Config: `*.config.*`, `*.json` (except package.json), `*.yaml`, `*.yml`, `*.toml`, `*.ini`, `.env*`, `.*rc`
   - Assets: `*.png`, `*.jpg`, `*.svg`, `*.gif`, `*.ico`, `*.woff*`, `*.ttf`, `*.eot`, `*.mp4`, `*.webm`
   - Generated: `*.lock`, `*.min.*`, `dist/`, `build/`, `node_modules/`, `.next/`, `__pycache__/`, `*.pyc`
   - Docs: `*.md`, `LICENSE*`, `CHANGELOG*`

   Save filtered list as ALL_FILES.

7. Create output directory:
   ```
   mkdir -p temp/RESEARCH-{TOPIC}/reports/
   ```

## Phase 1: Chunking

Spawn `research-chunker` agent (`model: sonnet`):

```
Read instructions at ~/.claude/agents/research-chunker.md. Follow all rules and output format.

Input:
  files:
  {ALL_FILES, one per line}

  project_stack: {PROJECT_STACK}
  architecture_context: {ARCHITECTURE_CONTEXT}
  output: temp/RESEARCH-{TOPIC}/chunks.md
```

Read `temp/RESEARCH-{TOPIC}/chunks.md`. Parse chunks: each `## Chunk N: label` section with its file list.

Save as CHUNKS list. Report: `Chunking complete: {N} chunks from {M} files.`

## Phase 2: Investigation

Spawn all chunk super-agents **in parallel** (single message with all Agent calls — one per chunk):

For each chunk, prepare the prompt:

1. Build the specialists YAML block from the topic's specialist list:
   ```
   specialists:
   - name: {specialist1_name}
     description: "{specialist1_description}"
   - name: {specialist2_name}
     description: "{specialist2_description}"
   ...
   ```

2. Spawn super-agent (`model: sonnet`) with prompt:

   ```
   research-specialist
   topic: {TOPIC}
   {specialists YAML block}
   chunk_id: {chunk_id}
   chunk_label: {chunk_label}
   files:
   {chunk files, one per line, prefixed with "- "}
   project_stack: {PROJECT_STACK}
   architecture_context: {ARCHITECTURE_CONTEXT}
   output: temp/RESEARCH-{TOPIC}/reports/chunk-{chunk_id_padded}.md
   ```

   Where `chunk_id_padded` is zero-padded to 3 digits (e.g., `001`, `012`).

3. Parse super-agent response for status: `DONE: N verified, M filtered, K false-positives`.

4. Log progress: `[Chunk {i}/{total} done — {chunk_label} — {N} verified findings]`

5. If super-agent returns error → log warning, continue with next chunk.

After all chunks complete, report: `Investigation complete: {total_chunks} chunks processed.`

## Phase 3: Collect & Validate

1. Read all `chunk-*.md` files from `temp/RESEARCH-{TOPIC}/reports/`.
2. Collect all `## Verified Findings` sections.
3. Parse individual findings. Merge into one list sorted: critical → medium → low.
4. Deduplicate: if same file:line and same problem appear from different chunks — keep one.
5. If 0 verified findings total → report "Research complete — no actionable issues found." → Phase 5.
6. Show overview: `Found {N} verified issues: {C} critical, {M} medium, {L} low.`
7. Build `CITED_FILES` = unique file paths from all deduplicated findings (strip `:line` suffix, deduplicate).

8. Second-opinion validation — spawn codex agent:

   ```
   codex research-verifier
   <all deduplicated findings in markdown format>

   chunk_files:
   <unique file paths extracted from the deduplicated findings (parse each finding's "File: path:line" — strip ":line" suffix, deduplicate, prefix each with "- ")>

   output: temp/RESEARCH-{TOPIC}/reports/second-opinion.md
   ```

9. Read `second-opinion.md`. Cross-reference: keep findings present in both the original verification AND the second opinion. Discard findings rejected by the second opinion.
10. Report: `Validated {N} of {M} findings. {K} filtered by second opinion.`
11. If 0 validated → "No findings survived validation." → Phase 5.
12. Proceed to Phase 4 with all validated findings as INCLUDED_FINDINGS.

## Phase 4: Spec Creation

Spawn `research-spec-writer` agent (`model: sonnet`):

```
Read instructions at ~/.claude/agents/research-spec-writer.md. Follow all rules and output format.

Input:
  task_name: RESEARCH-{TOPIC}
  topic: {TOPIC}
  findings:
  {INCLUDED_FINDINGS in markdown format}
  architecture_context: {ARCHITECTURE_CONTEXT}
  output_dir: temp/RESEARCH-{TOPIC}/
```

Verify output: read `temp/RESEARCH-{TOPIC}/technical-requirements.md` — confirm it exists and is non-empty.

## Phase 5: Report

```
## Research Complete: {TOPIC}

### Stats
- Files analyzed: {total_files} (in {total_chunks} chunks)
- Specialists per chunk: {N_specialists} (for {TOPIC} topic)
- Verified: {verified_count} (C:{c} M:{m} L:{l})
- Validated (after second opinion): {validated_count}, Filtered: {filtered_count}

### Task Created
RESEARCH-{TOPIC} → temp/RESEARCH-{TOPIC}/
→ /feature-implement RESEARCH-{TOPIC}
```

If no findings were validated (all filtered or none found), omit the "Task Created" section.

# Edge Cases

- **$ARGUMENTS contains extra text after topic** — ignore extra text, use first recognized topic word.
- **Empty project (0 files after filter)** — "No source files found after filtering. Check that the project has code files tracked by git."
- **Chunker returns 0 chunks** — same as empty project.
- **All chunks return 0 findings** — "No issues found." → Phase 5.
- **Super-agent fails for a chunk** — log warning with chunk label, continue with remaining chunks. Include warning count in final report.
- **Codex second-opinion fails** — log warning, include all originally verified findings (skip second-opinion step).

# Start

Phase 0.
