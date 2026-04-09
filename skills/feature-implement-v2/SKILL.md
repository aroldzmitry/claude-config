---
description: "Script-based feature implementation orchestrator. Same workflow as /feature-implement but runs as a bash script — no LLM orchestration overhead."
argument-hint: "<feature-name>: folder name in temp/"
allowed-tools: "Bash"
model: haiku
---

Normalize $ARGUMENTS to a bare feature name before running the script:
- If it's an absolute or relative path, extract just the last path segment (basename)
- Strip trailing slashes
- The result must be a single folder name with no slashes (e.g. `order-edit-complete`)

Run the feature implementation script with the normalized feature name.

```
Bash: ~/.claude/skills/feature-implement-v2/feature-implement.sh <normalized-feature-name>
```

Stream the output to the user. Do not add commentary — the script produces its own status messages and final report.