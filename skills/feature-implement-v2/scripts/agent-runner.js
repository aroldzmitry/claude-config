#!/usr/bin/env node
'use strict';

/**
 * agent-runner.js
 *
 * Executes a single worker by:
 * 1. Loading registry
 * 2. Resolving worker entry
 * 3. Validating task file (structural check)
 * 4. Loading worker prompt file
 * 5. Constructing combined prompt (task header + worker prompt)
 * 6. Invoking claude -p
 * 7. Checking for COMPACTED: true in stdout
 * 8. Reading result file
 * 9. Validating result (structural check)
 * 10. Returning compact runner status
 *
 * Usage:
 *   node agent-runner.js --worker <worker_id> --task <task_file_path> [--events <events_jsonl_path>]
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const SKILL_DIR = path.join(__dirname, '..');
const MODEL_MAP = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
};
const PERMISSION_MODE_MAP = {
  default: 'default',
  plan: 'plan',
  acceptEdits: 'acceptEdits',
  bypassPermissions: 'bypassPermissions',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--worker') result.worker = args[++i];
    else if (args[i] === '--task') result.task = args[++i];
    else if (args[i] === '--events') result.events = args[++i];
    else if (args[i] === '--registry') result.registry = args[++i];
    else if (args[i] === '--cwd') result.cwd = args[++i];
    else if (args[i] === '--timeout-ms') result.timeoutMs = parseInt(args[++i], 10);
    else if (args[i] === '--model-override') result.modelOverride = args[++i];
  }
  if (!result.worker) die('Missing --worker argument');
  if (!result.task) die('Missing --task argument');
  return result;
}

function die(msg) {
  process.stderr.write(`[agent-runner] ERROR: ${msg}\n`);
  process.exit(1);
}

function loadRegistry(registryOverride) {
  const registryPath = registryOverride || path.join(SKILL_DIR, 'workers', 'registry.json');
  if (!fs.existsSync(registryPath)) die(`Registry not found: ${registryPath}`);
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function resolveWorker(registry, workerId) {
  const worker = registry.workers[workerId];
  if (!worker) die(`Worker not found in registry: ${workerId}`);
  if (!worker.enabled) {
    return { status: 'worker_disabled', worker: workerId };
  }
  return worker;
}

function validateTask(taskPath, workerEntry) {
  if (!fs.existsSync(taskPath)) return { valid: false, error: `Task file not found: ${taskPath}` };
  let task;
  try {
    task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
  } catch (e) {
    return { valid: false, error: `Task file is not valid JSON: ${e.message}` };
  }

  // Structural validation — check required envelope fields
  const required = ['version', 'kind', 'workflow', 'run_id', 'request_id', 'worker', 'feature', 'spec_dir', 'inputs', 'context', 'output_path'];
  for (const field of required) {
    if (task[field] === undefined) return { valid: false, error: `Task missing required field: ${field}` };
  }
  if (task.kind !== 'agent-request') return { valid: false, error: `Task kind must be "agent-request", got "${task.kind}"` };
  if (task.workflow !== 'feature-implement-v2') return { valid: false, error: `Task workflow must be "feature-implement-v2"` };
  if (task.worker !== workerEntry.file.replace(/^workers\//, '').replace(/\.md$/, '') && task.worker !== workerEntry.worker_id) {
    // Allow worker field to be any string — it's informational
  }

  return { valid: true, task };
}

function validateResult(resultPath) {
  if (!fs.existsSync(resultPath)) return { valid: false, error: `Result file not found: ${resultPath}` };
  let result;
  try {
    result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  } catch (e) {
    return { valid: false, error: `Result file is not valid JSON: ${e.message}` };
  }

  const required = ['version', 'kind', 'workflow', 'run_id', 'request_id', 'worker', 'execution_status', 'next_action', 'summary', 'data', 'issues', 'artifacts'];
  for (const field of required) {
    if (result[field] === undefined) return { valid: false, error: `Result missing required field: ${field}` };
  }
  if (result.kind !== 'agent-result') return { valid: false, error: `Result kind must be "agent-result"` };

  const validStatuses = ['succeeded', 'failed', 'blocked', 'skipped', 'invalid_result', 'timeout'];
  if (!validStatuses.includes(result.execution_status)) {
    return { valid: false, error: `Invalid execution_status: "${result.execution_status}"` };
  }

  return { valid: true, result };
}

function constructPrompt(task, taskPath, workerPromptPath) {
  const taskJson = JSON.stringify(task, null, 2);
  const workerPrompt = fs.readFileSync(workerPromptPath, 'utf8');

  const header = `## Runtime Task\ntask_file: ${taskPath}\nresult_file: ${task.output_path}\n\n${taskJson}\n\n---\n\n`;
  return header + workerPrompt;
}

function appendEvent(eventsPath, event) {
  if (!eventsPath) return;
  try {
    fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');
  } catch (e) {
    // Non-fatal: events are best-effort
    process.stderr.write(`[agent-runner] Warning: could not append event: ${e.message}\n`);
  }
}

function run() {
  const startTime = Date.now();
  const args = parseArgs();

  const registry = loadRegistry(args.registry);
  const workerEntry = resolveWorker(registry, args.worker);
  if (workerEntry.status === 'worker_disabled') {
    const out = { status: 'worker_disabled', worker: args.worker, task_path: args.task, result_path: null, duration_ms: 0 };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  // Validate task
  const taskValidation = validateTask(args.task, { ...workerEntry, worker_id: args.worker });
  if (!taskValidation.valid) {
    const out = { status: 'task_invalid', worker: args.worker, task_path: args.task, result_path: null, duration_ms: 0, error: taskValidation.error };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }
  const task = taskValidation.task;

  // Resolve worker prompt file
  const workerPromptPath = path.join(SKILL_DIR, workerEntry.file);
  if (!fs.existsSync(workerPromptPath)) {
    const out = { status: 'task_invalid', worker: args.worker, task_path: args.task, result_path: null, duration_ms: 0, error: `Worker prompt not found: ${workerPromptPath}` };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  // Ensure result directory exists
  const resultDir = path.dirname(task.output_path);
  fs.mkdirSync(resultDir, { recursive: true });

  // Construct combined prompt
  const prompt = constructPrompt(task, args.task, workerPromptPath);

  // Write to temp file
  const tmpPromptFile = path.join(os.tmpdir(), `worker_run_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(tmpPromptFile, prompt);

  // Resolve model, max_turns, permission_mode
  const model = args.modelOverride || MODEL_MAP[workerEntry.model] || workerEntry.model;
  const maxTurns = workerEntry.max_turns;
  const permissionMode = PERMISSION_MODE_MAP[workerEntry.permission_mode] || 'default';
  const timeoutMs = args.timeoutMs || workerEntry.timeout_ms || registry.defaults.timeout_ms || 300000;

  // Resolve tools
  const tools = workerEntry.tools ? workerEntry.tools.join(',') : null;

  // Resolve CWD
  const cwd = args.cwd || process.cwd();

  // Ensure log directory for raw output
  const logsDir = path.join(path.dirname(path.dirname(task.output_path)), '..', 'logs', args.worker);
  fs.mkdirSync(logsDir, { recursive: true });
  const attemptNum = (() => {
    const existing = fs.existsSync(logsDir) ? fs.readdirSync(logsDir).filter(f => f.startsWith('run-')).length : 0;
    return existing + 1;
  })();
  const logFile = path.join(logsDir, `run-${attemptNum}.log`);

  // Append worker_started event
  appendEvent(args.events, {
    version: 1,
    timestamp: new Date().toISOString(),
    run_id: task.run_id,
    phase: task.context.phase || 'unknown',
    worker_id: args.worker,
    attempt: 1,
    event_type: 'worker_started',
    status: 'running',
    step_id: task.context.step_number ? `step-${task.context.step_number}` : undefined,
  });

  // Build claude command
  const claudeArgs = [
    '-p', `$(cat "${tmpPromptFile}")`,
    '--max-turns', String(maxTurns),
    '--model', model,
    '--permission-mode', permissionMode,
  ];
  if (tools) claudeArgs.push('--allowedTools', tools);

  // Run via shell to support $(cat ...) expansion
  const shellCmd = [
    'claude',
    '-p', `"$(cat '${tmpPromptFile}')"`,
    '--max-turns', String(maxTurns),
    '--model', model,
    '--permission-mode', permissionMode,
    ...(tools ? ['--allowedTools', tools] : []),
  ].join(' ');

  let stdout = '';
  let timedOut = false;
  let executionFailed = false;

  try {
    const result = spawnSync('bash', ['-c', shellCmd], {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf8',
    });

    if (result.error) {
      if (result.error.code === 'ETIMEDOUT') {
        timedOut = true;
      } else {
        executionFailed = true;
      }
    }

    stdout = result.stdout || '';
    const stderr = result.stderr || '';

    // Save raw log
    fs.writeFileSync(logFile, `=== STDOUT ===\n${stdout}\n\n=== STDERR ===\n${stderr}\n`);
  } catch (e) {
    executionFailed = true;
    stdout = '';
  } finally {
    // Clean up temp prompt file
    try { fs.unlinkSync(tmpPromptFile); } catch (_) {}
  }

  const duration_ms = Date.now() - startTime;

  // Check for COMPACTED: true
  const compacted = stdout.split('\n').some(line => line.trim() === 'COMPACTED: true');
  if (compacted && args.events) {
    appendEvent(args.events, {
      version: 1,
      timestamp: new Date().toISOString(),
      run_id: task.run_id,
      phase: task.context.phase || 'unknown',
      worker_id: args.worker,
      attempt: 1,
      event_type: 'warning_recorded',
      status: 'warning',
      details: { reason: 'compaction', worker_id: args.worker },
    });
  }

  if (timedOut) {
    appendEvent(args.events, {
      version: 1,
      timestamp: new Date().toISOString(),
      run_id: task.run_id,
      phase: task.context.phase || 'unknown',
      worker_id: args.worker,
      attempt: 1,
      event_type: 'worker_finished',
      status: 'timeout',
    });
    const out = { status: 'execution_failed', reason: 'timeout', worker: args.worker, task_path: args.task, result_path: task.output_path, duration_ms, compacted };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  if (executionFailed) {
    appendEvent(args.events, {
      version: 1,
      timestamp: new Date().toISOString(),
      run_id: task.run_id,
      phase: task.context.phase || 'unknown',
      worker_id: args.worker,
      attempt: 1,
      event_type: 'worker_finished',
      status: 'execution_failed',
    });
    const out = { status: 'execution_failed', reason: 'spawn_error', worker: args.worker, task_path: args.task, result_path: task.output_path, duration_ms, compacted };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  // Validate result
  const resultValidation = validateResult(task.output_path);

  if (!resultValidation.valid) {
    appendEvent(args.events, {
      version: 1,
      timestamp: new Date().toISOString(),
      run_id: task.run_id,
      phase: task.context.phase || 'unknown',
      worker_id: args.worker,
      attempt: 1,
      event_type: 'worker_finished',
      status: 'result_invalid',
      details: { reason: resultValidation.error },
    });
    const out = { status: 'result_invalid', error: resultValidation.error, worker: args.worker, task_path: args.task, result_path: task.output_path, duration_ms, compacted };
    process.stdout.write(JSON.stringify(out) + '\n');
    return;
  }

  appendEvent(args.events, {
    version: 1,
    timestamp: new Date().toISOString(),
    run_id: task.run_id,
    phase: task.context.phase || 'unknown',
    worker_id: args.worker,
    attempt: 1,
    event_type: 'worker_finished',
    status: resultValidation.result.execution_status,
    step_id: task.context.step_number ? `step-${task.context.step_number}` : undefined,
  });

  const out = {
    status: 'ok',
    worker: args.worker,
    task_path: args.task,
    result_path: task.output_path,
    duration_ms,
    compacted,
    execution_status: resultValidation.result.execution_status,
    next_action: resultValidation.result.next_action,
  };
  process.stdout.write(JSON.stringify(out) + '\n');
}

run();
