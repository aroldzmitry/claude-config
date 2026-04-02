---
description: "Script-based feature implementation orchestrator. Same workflow as /feature-implement but runs as a bash script — no LLM orchestration overhead."
argument-hint: "<feature-name>: folder name in temp/"
allowed-tools: "Bash"
model: haiku
---

Run the feature implementation script. Pass $ARGUMENTS as the feature name.

```
Bash: ~/.claude/skills/feature-implement-v2/feature-implement.sh $ARGUMENTS
```

Stream the output to the user. Do not add commentary — the script produces its own status messages and final report.