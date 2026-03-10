#!/usr/bin/env node
'use strict';

/**
 * convert-inputs.js
 *
 * Deterministic converter: reads spec .md files from spec_dir,
 * converts each to validated runtime JSON, writes to runtime_dir/input/.
 *
 * Used by the preprocessor worker as primary conversion strategy.
 *
 * Usage:
 *   node convert-inputs.js --spec-dir <path> --runtime-dir <path> --feature <name>
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spec-dir') result.specDir = args[++i];
    else if (args[i] === '--runtime-dir') result.runtimeDir = args[++i];
    else if (args[i] === '--feature') result.feature = args[++i];
  }
  if (!result.specDir) die('Missing --spec-dir');
  if (!result.runtimeDir) die('Missing --runtime-dir');
  if (!result.feature) die('Missing --feature');
  return result;
}

function die(msg) {
  process.stderr.write(`[convert-inputs] ERROR: ${msg}\n`);
  process.exit(1);
}

function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

// ─── Markdown parser helpers ───────────────────────────────────────────────────

function parseSections(text) {
  const sections = {};
  let currentHeading = null;
  let currentLines = [];

  for (const line of text.split('\n')) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading !== null) {
        sections[currentHeading] = currentLines.join('\n').trim();
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      if (currentHeading !== null) {
        currentLines.push(line);
      }
    }
  }
  if (currentHeading !== null) {
    sections[currentHeading] = currentLines.join('\n').trim();
  }
  return sections;
}

function detectPriority(text) {
  const lower = text.toLowerCase();
  if (/\[must\]|\bmust\b/.test(lower)) return 'must';
  if (/\[should\]|\bshould\b/.test(lower)) return 'should';
  if (/\[could\]|\bcould\b/.test(lower)) return 'could';
  if (/\[wont\]|\bwon't\b|\bwont\b/.test(lower)) return 'wont';
  return 'must';
}

function extractRequirements(sections, prefix) {
  const requirements = [];
  let counter = 1;

  for (const [section, content] of Object.entries(sections)) {
    // Split on list items or paragraphs
    const items = content
      .split(/\n(?=[-*•\d]|\n)/)
      .map(s => s.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 10);

    for (const item of items) {
      const cleanItem = item.replace(/\s+/g, ' ').trim();
      if (!cleanItem) continue;
      const id = `${prefix}-${String(counter).padStart(3, '0')}`;
      requirements.push({
        id,
        section,
        text: cleanItem,
        priority: detectPriority(cleanItem),
      });
      counter++;
    }
  }

  return requirements;
}

// ─── Converters ────────────────────────────────────────────────────────────────

function convertTechnicalRequirements(text, feature, sourcePath) {
  const sections = parseSections(text);
  const requirements = extractRequirements(sections, 'tr');

  // Extract constraints from sections that sound like constraints
  const constraintSections = Object.entries(sections).filter(([k]) =>
    /constraint|limit|restriction|non-functional|performance|security|scalab/i.test(k)
  );
  const constraints = constraintSections.flatMap(([section, content]) =>
    content.split(/\n(?=[-*•])/)
      .map(s => s.replace(/^[-*•]\s*/, '').trim())
      .filter(s => s.length > 5)
      .map(text => ({ text, category: section }))
  );

  return {
    version: 1,
    source: sourcePath,
    feature,
    requirements,
    constraints,
    raw_sections: sections,
  };
}

function convertBusinessRequirements(text, feature, sourcePath) {
  const sections = parseSections(text);
  const requirements = extractRequirements(sections, 'br');
  return {
    version: 1,
    source: sourcePath,
    feature,
    requirements,
    raw_sections: sections,
  };
}

function convertUiRequirements(text, feature, sourcePath) {
  const sections = parseSections(text);
  const requirements = extractRequirements(sections, 'ui');
  return {
    version: 1,
    source: sourcePath,
    feature,
    requirements: requirements.map(r => ({
      ...r,
      component: extractComponent(r.text),
    })),
    raw_sections: sections,
  };
}

function extractComponent(text) {
  const match = text.match(/(?:component|page|view|screen|modal|dialog|form|button|input|list|table|card)[\s:]+([A-Za-z]+)/i);
  return match ? match[1] : null;
}

function convertTestCases(text, feature, sourcePath) {
  const sections = parseSections(text);

  // Detect test strategy
  const strategySection = Object.entries(sections).find(([k]) => /strategy|approach|level/i.test(k));
  const levels = strategySection
    ? (['unit', 'integration', 'e2e'].filter(l => strategySection[1].toLowerCase().includes(l)))
    : ['unit'];

  // Extract test cases from all sections
  const testCases = [];
  let counter = 1;

  for (const [section, content] of Object.entries(sections)) {
    if (/strategy|approach|level/i.test(section)) continue;

    const lines = content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const itemMatch = line.match(/^[-*•]\s*(?:\[[ x]\]\s*)?(?:\[(must|should|could)\]\s*)?(.+)/i);
      if (!itemMatch) continue;

      const priorityStr = itemMatch[1] ? itemMatch[1].toLowerCase() : detectPriority(itemMatch[2]);
      const scenarioText = itemMatch[2].trim();
      if (scenarioText.length < 5) continue;

      // Split scenario from expected if " — " or " -> " or " => " is present
      const separators = [' — ', ' -> ', ' => ', ' should '];
      let scenario = scenarioText;
      let expected = null;
      for (const sep of separators) {
        const idx = scenarioText.indexOf(sep);
        if (idx > 0) {
          scenario = scenarioText.slice(0, idx).trim();
          expected = scenarioText.slice(idx + sep.length).trim();
          break;
        }
      }

      testCases.push({
        id: `tc-${String(counter).padStart(3, '0')}`,
        section,
        priority: priorityStr,
        scenario,
        expected: expected || null,
      });
      counter++;
    }
  }

  return {
    version: 1,
    source: sourcePath,
    feature,
    test_strategy: { levels: levels.length ? levels : ['unit'], exclusions: [] },
    test_cases: testCases,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs();
  const { specDir, runtimeDir, feature } = args;

  const inputDir = path.join(runtimeDir, 'input');
  fs.mkdirSync(inputDir, { recursive: true });

  const sourceFiles = [
    { name: 'technical-requirements', file: 'technical-requirements.md', required: true },
    { name: 'business-requirements', file: 'business-requirements.md', required: false },
    { name: 'ui-requirements', file: 'ui-requirements.md', required: false },
    { name: 'test-cases', file: 'test-cases.md', required: false },
  ];

  const report = {
    version: 1,
    feature,
    status: 'succeeded',
    required_missing: [],
    converted: [],
    skipped: [],
    warnings: [],
    errors: [],
  };

  const index = {
    version: 1,
    feature,
    inputs: [],
  };

  for (const src of sourceFiles) {
    const sourcePath = path.join(specDir, src.file);
    const outputPath = path.join(inputDir, `${src.name}.json`);

    if (!fs.existsSync(sourcePath)) {
      if (src.required) {
        report.status = 'failed';
        report.required_missing.push(src.file);
        report.errors.push({ severity: 'error', code: 'required-missing', message: `Required file not found: ${src.file}`, source: src.file });
      } else {
        report.skipped.push({ type: src.name, reason: 'source file not present' });
      }
      continue;
    }

    const text = fs.readFileSync(sourcePath, 'utf8');
    let converted;

    try {
      switch (src.name) {
        case 'technical-requirements':
          converted = convertTechnicalRequirements(text, feature, path.relative(process.cwd(), sourcePath));
          break;
        case 'business-requirements':
          converted = convertBusinessRequirements(text, feature, path.relative(process.cwd(), sourcePath));
          break;
        case 'ui-requirements':
          converted = convertUiRequirements(text, feature, path.relative(process.cwd(), sourcePath));
          break;
        case 'test-cases':
          converted = convertTestCases(text, feature, path.relative(process.cwd(), sourcePath));
          break;
      }
    } catch (e) {
      report.status = 'failed';
      report.errors.push({ severity: 'error', code: 'conversion-error', message: `Failed to convert ${src.file}: ${e.message}`, source: src.file });
      continue;
    }

    // Basic schema check
    if (!converted || !converted.version || !converted.requirements) {
      report.status = 'failed';
      report.errors.push({ severity: 'error', code: 'invalid-output', message: `Conversion produced invalid output for ${src.file}`, source: src.file });
      continue;
    }

    atomicWrite(outputPath, JSON.stringify(converted, null, 2));
    report.converted.push({
      source: path.relative(process.cwd(), sourcePath),
      output: path.relative(process.cwd(), outputPath),
      type: src.name,
    });
    index.inputs.push({
      type: src.name,
      source: path.relative(process.cwd(), sourcePath),
      output: path.relative(process.cwd(), outputPath),
    });
  }

  // Write conversion report
  atomicWrite(path.join(inputDir, 'conversion-report.json'), JSON.stringify(report, null, 2));

  // Write normalized input index
  atomicWrite(path.join(inputDir, 'normalized-input-index.json'), JSON.stringify(index, null, 2));

  // Output result summary for caller
  const output = {
    status: report.status,
    converted_count: report.converted.length,
    skipped_count: report.skipped.length,
    errors: report.errors,
    conversion_report: path.join(inputDir, 'conversion-report.json'),
    normalized_input_index: path.join(inputDir, 'normalized-input-index.json'),
  };
  process.stdout.write(JSON.stringify(output) + '\n');

  if (report.status === 'failed') process.exit(1);
}

main();
