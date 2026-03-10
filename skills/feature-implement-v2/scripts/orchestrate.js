#!/usr/bin/env node
'use strict';

/**
 * orchestrate.js
 *
 * Main entry point for the feature-implement-v2 runtime.
 *
 * Usage:
 *   node orchestrate.js <feature-name> [--preprocess-only]
 *   node orchestrate.js --spec-dir <path> [--feature <name>] [--preprocess-only]
 *
 * Resume: Re-run the same command. If run.json exists, orchestrator resumes from current_phase.
 *
 * Phases (in order):
 *   preprocess → plan → test_write → implement → self_check →
 *   cli_repair → validate → validation_repair → improve →
 *   regression_apply → finalize
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const SKILL_DIR = path.join(__dirname, '..');
const AGENT_RUNNER = path.join(__dirname, 'agent-runner.js');

const CLI_REPAIR_CAP = 3;
const VALIDATION_REPAIR_CAP = 3;
const NON_MUTATING_RETRY_CAP = 2;
const PLANNER_RETRY_CAP = 1;
const TOTAL_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

// ─── Arg Parsing ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { feature: null, specDir: null, preprocessOnly: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spec-dir') result.specDir = args[++i];
    else if (args[i] === '--feature') result.feature = args[++i];
    else if (args[i] === '--preprocess-only') result.preprocessOnly = true;
    else if (!args[i].startsWith('-') && !result.feature) result.feature = args[i];
  }

  if (!result.feature && !result.specDir) {
    console.error('Usage: node orchestrate.js <feature-name> [--preprocess-only]');
    console.error('       node orchestrate.js --spec-dir <path> [--preprocess-only]');
    process.exit(1);
  }

  return result;
}

// ─── Path Resolution ───────────────────────────────────────────────────────────

function resolvePaths(args) {
  const cwd = process.cwd();
  const feature = args.feature || path.basename(args.specDir);
  const specDir = args.specDir ? path.resolve(cwd, args.specDir) : path.join(cwd, 'temp', feature);
  const runtimeDir = path.join(specDir, 'runtime');

  return {
    cwd,
    feature,
    specDir,
    runtimeDir,
    runJson: path.join(runtimeDir, 'run.json'),
    eventsJsonl: path.join(runtimeDir, 'logs', 'events.jsonl'),
    lockFile: path.join(runtimeDir, '.lock'),
    inputDir: path.join(runtimeDir, 'input'),
    tasksDir: path.join(runtimeDir, 'tasks'),
    resultsDir: path.join(runtimeDir, 'results'),
    artifactsDir: path.join(runtimeDir, 'artifacts'),
    logsDir: path.join(runtimeDir, 'logs'),
    userReport: path.join(runtimeDir, 'logs', 'user-report.md'),
  };
}

// ─── Git Check ────────────────────────────────────────────────────────────────

function checkGitClean(cwd) {
  const result = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
  if (result.error) return; // Not a git repo or git not available — skip check
  const dirty = (result.stdout || '').trim();
  if (dirty) {
    console.error('ERROR: Git working tree is dirty. Commit or stash changes before starting a new run.');
    console.error('Uncommitted files:');
    dirty.split('\n').forEach(line => console.error(' ', line));
    process.exit(1);
  }
}

// ─── Atomic Write ─────────────────────────────────────────────────────────────

function atomicWrite(filePath, obj) {
  const tmp = filePath + '.tmp';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ─── Events Ledger ────────────────────────────────────────────────────────────

function appendEvent(eventsPath, event) {
  try {
    fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
    fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');
  } catch (e) {
    // Non-fatal
  }
}

function makeEvent(run, eventType, workerId, status, extras = {}) {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    run_id: run.run_id,
    phase: run.current_phase,
    worker_id: workerId || '',
    attempt: 1,
    event_type: eventType,
    status,
    ...extras,
  };
}

// ─── Workspace Lock ───────────────────────────────────────────────────────────

function acquireLock(lockFile, workerId) {
  // Check for stale lock
  if (fs.existsSync(lockFile)) {
    let lockData;
    try {
      lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    } catch (_) {
      // Corrupt lock — remove
      fs.unlinkSync(lockFile);
    }
    if (lockData) {
      // Check if PID is still alive
      try {
        process.kill(lockData.pid, 0);
        // Process alive — lock is held
        throw new Error(`Another run is holding the workspace lock (PID ${lockData.pid}, worker: ${lockData.worker_id})`);
      } catch (e) {
        if (e.code === 'ESRCH') {
          // Process dead — stale lock, remove it
          fs.unlinkSync(lockFile);
        } else {
          throw e;
        }
      }
    }
  }
  // Acquire lock
  const lockData = { pid: process.pid, worker_id: workerId, acquired_at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  fs.writeFileSync(lockFile, JSON.stringify(lockData), 'utf8');
}

function releaseLock(lockFile) {
  try {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  } catch (_) {}
}

// ─── Run State ────────────────────────────────────────────────────────────────

function createRun(feature, runId) {
  return {
    version: 1,
    run_id: runId,
    runtime_family: 'feature-implement-v2',
    workflow: 'feature-implement-v2',
    feature,
    status: 'running',
    current_phase: 'preprocess',
    current_worker: null,
    current_step_id: null,
    progress: { total_steps: null, completed_steps: 0 },
    iterations: { cli: 0, validation: 0 },
    outcome: { issues_remaining: 0, unresolved_workers: 0 },
    cost: { duration_ms: 0 },
    signals: { retry_count: 0, worker_failures: 0, compactions: 0 },
    artifacts: {},
    _start_time: Date.now(),
  };
}

function loadRun(runJsonPath) {
  const run = JSON.parse(fs.readFileSync(runJsonPath, 'utf8'));
  run._start_time = Date.now();
  return run;
}

function persistRun(run, runJsonPath) {
  run.cost.duration_ms = Date.now() - run._start_time;
  const toWrite = { ...run };
  delete toWrite._start_time;
  atomicWrite(runJsonPath, toWrite);
}

// ─── Task Builder ─────────────────────────────────────────────────────────────

let requestCounter = 0;
function nextRequestId(workerId) {
  return `${workerId}-${String(++requestCounter).padStart(3, '0')}`;
}

function buildTask(run, paths, workerId, inputs, context) {
  const requestId = nextRequestId(workerId);
  const taskDir = path.join(paths.tasksDir, workerId);
  const resultDir = path.join(paths.resultsDir, workerId);
  fs.mkdirSync(taskDir, { recursive: true });
  fs.mkdirSync(resultDir, { recursive: true });

  const taskPath = path.join(taskDir, `task-${String(requestCounter).padStart(3, '0')}.json`);
  const resultPath = path.join(resultDir, `result-${String(requestCounter).padStart(3, '0')}.json`);

  const task = {
    version: 1,
    kind: 'agent-request',
    workflow: 'feature-implement-v2',
    run_id: run.run_id,
    request_id: requestId,
    worker: workerId,
    feature: run.feature,
    spec_dir: paths.specDir,
    inputs,
    context: { ...context, phase: run.current_phase },
    output_path: resultPath,
  };

  atomicWrite(taskPath, task);
  return { taskPath, resultPath, requestId };
}

// ─── Agent Runner Invocation ──────────────────────────────────────────────────

function runWorker(run, paths, workerId, inputs, context, retryAttempt = 0) {
  run.current_worker = workerId;
  persistRun(run, paths.runJson);

  const { taskPath, resultPath } = buildTask(run, paths, workerId, inputs, context);

  appendEvent(paths.eventsJsonl, makeEvent(run, 'worker_started', workerId, 'running',
    context.step_number ? { step_id: `step-${context.step_number}` } : {}
  ));

  const result = spawnSync('node', [
    AGENT_RUNNER,
    '--worker', workerId,
    '--task', taskPath,
    '--events', paths.eventsJsonl,
  ], {
    cwd: paths.cwd,
    encoding: 'utf8',
    timeout: TOTAL_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
  });

  let runnerStatus;
  try {
    runnerStatus = JSON.parse((result.stdout || '').trim());
  } catch (_) {
    runnerStatus = { status: 'execution_failed', reason: 'no_output', worker: workerId };
  }

  const compacted = runnerStatus.compacted || false;
  if (compacted) run.signals.compactions++;

  if (runnerStatus.status === 'ok') {
    // Load and return the result
    const workerResult = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    return { ok: true, result: workerResult, resultPath, compacted };
  }

  if (runnerStatus.status === 'execution_failed' || runnerStatus.status === 'result_invalid') {
    const isRetryable = runnerStatus.status === 'execution_failed' || runnerStatus.status === 'result_invalid';
    if (isRetryable && retryAttempt < NON_MUTATING_RETRY_CAP) {
      run.signals.retry_count++;
      appendEvent(paths.eventsJsonl, makeEvent(run, 'worker_retried', workerId, 'retrying',
        { details: { reason: runnerStatus.reason || runnerStatus.status, attempt_limit: NON_MUTATING_RETRY_CAP } }
      ));
      return runWorker(run, paths, workerId, inputs, context, retryAttempt + 1);
    }
    run.signals.worker_failures++;
    return { ok: false, status: 'failed', reason: runnerStatus.status, resultPath, compacted };
  }

  return { ok: false, status: runnerStatus.status, reason: runnerStatus.reason, resultPath, compacted };
}

// ─── Helper: read result safely ───────────────────────────────────────────────

function readResult(resultPath) {
  if (!resultPath || !fs.existsSync(resultPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

// ─── Phase Handlers ───────────────────────────────────────────────────────────

// Phase: preprocess
function runPreprocess(run, paths) {
  run.current_phase = 'preprocess';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'preprocessor', 'running'));
  persistRun(run, paths.runJson);

  // First try deterministic converter
  const convertResult = spawnSync('node', [
    path.join(__dirname, 'convert-inputs.js'),
    '--spec-dir', paths.specDir,
    '--runtime-dir', paths.runtimeDir,
    '--feature', run.feature,
  ], { cwd: paths.cwd, encoding: 'utf8' });

  let conversionStatus = 'failed';
  let convertedCount = 0;
  let conversionReportPath = path.join(paths.inputDir, 'conversion-report.json');
  let normalizedIndexPath = path.join(paths.inputDir, 'normalized-input-index.json');

  if (convertResult.status === 0) {
    try {
      const convOut = JSON.parse((convertResult.stdout || '').trim());
      conversionStatus = convOut.status;
      convertedCount = convOut.converted_count || 0;
      conversionReportPath = convOut.conversion_report || conversionReportPath;
      normalizedIndexPath = convOut.normalized_input_index || normalizedIndexPath;
    } catch (_) {}
  }

  if (conversionStatus === 'failed') {
    // Fallback: invoke preprocessor LLM worker
    const inputs = {};
    const context = {};
    const workerRun = runWorker(run, paths, 'preprocessor', inputs, context);

    if (!workerRun.ok) {
      return { status: 'failed', reason: `Preprocessor failed: ${workerRun.reason}` };
    }

    const result = workerRun.result;
    if (result.execution_status === 'failed') {
      return { status: 'failed', reason: `Preprocessor: ${result.summary}` };
    }
    conversionStatus = 'succeeded';
    convertedCount = result.data.converted_count || 0;
    conversionReportPath = result.data.conversion_report || conversionReportPath;
    normalizedIndexPath = result.data.normalized_input_index || normalizedIndexPath;
  }

  if (conversionStatus === 'failed') {
    return { status: 'failed', reason: 'Preprocessing failed: required inputs missing or invalid' };
  }

  // Record artifacts
  run.artifacts.conversion_report = path.relative(paths.cwd, conversionReportPath);
  run.artifacts.normalized_input_index = path.relative(paths.cwd, normalizedIndexPath);
  run.current_phase = 'plan';
  return { status: 'ok' };
}

// Phase: plan (planner + plan-validator)
function runPlan(run, paths) {
  run.current_phase = 'plan';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'planner', 'running'));
  persistRun(run, paths.runJson);

  const techReqPath = path.join(paths.inputDir, 'technical-requirements.json');
  const bizReqPath = path.join(paths.inputDir, 'business-requirements.json');
  const uiReqPath = path.join(paths.inputDir, 'ui-requirements.json');
  const testCasesPath = path.join(paths.inputDir, 'test-cases.json');

  const inputs = { technical_requirements: techReqPath };
  if (fs.existsSync(bizReqPath)) inputs.business_requirements = bizReqPath;
  if (fs.existsSync(uiReqPath)) inputs.ui_requirements = uiReqPath;
  if (fs.existsSync(testCasesPath)) inputs.test_cases = testCasesPath;

  let plannerRun = runWorker(run, paths, 'planner', inputs, { mode: 'implement' });

  if (!plannerRun.ok) {
    // Allow one retry for non-mutating failure
    if (run.signals.retry_count < PLANNER_RETRY_CAP) {
      run.signals.retry_count++;
      plannerRun = runWorker(run, paths, 'planner', inputs, { mode: 'implement' });
    }
    if (!plannerRun.ok) {
      return { status: 'failed', reason: `Planner failed: ${plannerRun.reason}` };
    }
  }

  const plannerResult = plannerRun.result;
  if (plannerResult.execution_status === 'failed') {
    return { status: 'failed', reason: `Planner: ${plannerResult.summary}` };
  }

  // Extract artifact paths from planner result
  const planningArtifacts = {};
  for (const artifact of (plannerResult.artifacts || [])) {
    planningArtifacts[artifact.role] = artifact.path;
  }

  const coderPlanPath = planningArtifacts['coder-plan'] || path.join(paths.artifactsDir, 'planning', 'coder-plan.json');
  const testPlanPath = planningArtifacts['test-plan'] || path.join(paths.artifactsDir, 'planning', 'test-plan.json');
  const planningMetaPath = planningArtifacts['planning-meta'] || path.join(paths.artifactsDir, 'planning', 'planning-meta.json');

  // Update progress
  if (plannerResult.data && plannerResult.data.step_count) {
    run.progress.total_steps = plannerResult.data.step_count;
  }

  // Run plan-validator
  const validatorInputs = {
    technical_requirements: techReqPath,
    coder_plan: coderPlanPath,
    test_plan: testPlanPath,
    planning_meta: planningMetaPath,
  };
  if (inputs.business_requirements) validatorInputs.business_requirements = inputs.business_requirements;

  const validatorRun = runWorker(run, paths, 'plan-validator', validatorInputs, {});

  if (!validatorRun.ok) {
    return { status: 'failed', reason: `Plan-validator failed: ${validatorRun.reason}` };
  }

  const validatorResult = validatorRun.result;
  if (validatorResult.execution_status === 'failed') {
    return { status: 'failed', reason: `Plan-validator: ${validatorResult.summary}` };
  }

  // Record artifacts
  run.artifacts['coder-plan'] = path.relative(paths.cwd, coderPlanPath);
  run.artifacts['test-plan'] = path.relative(paths.cwd, testPlanPath);
  run.artifacts['planning-meta'] = path.relative(paths.cwd, planningMetaPath);
  run.current_phase = 'test_write';
  return { status: 'ok' };
}

// Phase: test_write
function runTestWrite(run, paths) {
  run.current_phase = 'test_write';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'test-writer', 'running'));
  persistRun(run, paths.runJson);

  const testPlanPath = path.join(paths.artifactsDir, 'planning', 'test-plan.json');
  if (!fs.existsSync(testPlanPath)) {
    run.current_phase = 'implement';
    return { status: 'ok' };
  }

  const testPlan = readResult(testPlanPath);
  if (!testPlan || testPlan.test_strategy?.skip === true) {
    run.current_phase = 'implement';
    return { status: 'ok' };
  }

  const techReqPath = path.join(paths.inputDir, 'technical-requirements.json');
  const testCasesPath = path.join(paths.inputDir, 'test-cases.json');
  const coderPlanPath = path.join(paths.artifactsDir, 'planning', 'coder-plan.json');

  const inputs = {
    technical_requirements: techReqPath,
    test_plan: testPlanPath,
    coder_plan: coderPlanPath,
  };
  if (fs.existsSync(testCasesPath)) inputs.test_cases = testCasesPath;

  const writerRun = runWorker(run, paths, 'test-writer', inputs, {});

  if (!writerRun.ok) {
    return { status: 'failed', reason: `Test-writer failed: ${writerRun.reason}` };
  }

  const result = writerRun.result;
  if (result.execution_status === 'failed') {
    return { status: 'failed', reason: `Test-writer: ${result.summary}` };
  }

  run.current_phase = 'implement';
  return { status: 'ok' };
}

// Phase: implement (step loop)
function runImplement(run, paths) {
  run.current_phase = 'implement';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'coder-implement', 'running'));
  persistRun(run, paths.runJson);

  const coderPlanPath = path.join(paths.artifactsDir, 'planning', 'coder-plan.json');
  if (!fs.existsSync(coderPlanPath)) {
    return { status: 'failed', reason: 'coder-plan.json not found' };
  }

  const coderPlan = JSON.parse(fs.readFileSync(coderPlanPath, 'utf8'));
  const steps = coderPlan.steps || [];
  run.progress.total_steps = steps.length;

  const techReqPath = path.join(paths.inputDir, 'technical-requirements.json');
  const bizReqPath = path.join(paths.inputDir, 'business-requirements.json');
  const projectContextPath = path.join(SKILL_DIR, 'references', 'project-context.json');

  // Discover CLI commands (try from WORKFLOW.md or package.json)
  const cliCommands = discoverCliCommands(paths.cwd);

  // Determine starting step from current_step_id on resume
  let startStep = 0;
  if (run.current_step_id) {
    const stepNum = parseInt(run.current_step_id.replace('step-', ''), 10);
    if (!isNaN(stepNum)) {
      startStep = stepNum - 1; // steps are 1-indexed
    }
  }

  const allChangedFiles = new Set();

  for (let i = startStep; i < steps.length; i++) {
    const step = steps[i];
    const stepId = `step-${step.number}`;
    run.current_step_id = stepId;
    persistRun(run, paths.runJson);

    const inputs = {
      project_context: projectContextPath,
      technical_requirements: techReqPath,
      coder_plan: coderPlanPath,
    };
    if (fs.existsSync(bizReqPath)) inputs.business_requirements = bizReqPath;

    const context = {
      step_number: step.number,
      cli: cliCommands,
    };

    acquireLock(paths.lockFile, 'coder-implement');
    let implRun;
    try {
      implRun = runWorker(run, paths, 'coder-implement', inputs, context);
    } finally {
      releaseLock(paths.lockFile);
    }

    if (!implRun.ok) {
      return { status: 'failed', reason: `coder-implement step ${step.number} failed: ${implRun.reason}` };
    }

    const result = implRun.result;
    if (result.execution_status === 'failed') {
      return { status: 'failed', reason: `coder-implement step ${step.number}: ${result.summary}` };
    }

    if (result.data.step_result === 'unresolved') {
      run.outcome.unresolved_workers++;
      run.outcome.issues_remaining++;
      return { status: 'unresolved', reason: `Step ${step.number} unresolved: ${result.summary}` };
    }

    // Collect changed files
    for (const f of (result.data.files_changed || [])) allChangedFiles.add(f);
    run.progress.completed_steps = i + 1;
    persistRun(run, paths.runJson);
  }

  // Store changed files for self-checker
  run._changed_files = Array.from(allChangedFiles);
  run.current_step_id = null;
  run.current_phase = 'self_check';
  return { status: 'ok' };
}

// Phase: self_check
function runSelfCheck(run, paths) {
  run.current_phase = 'self_check';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'self-checker', 'running'));
  persistRun(run, paths.runJson);

  const changedFiles = run._changed_files || [];
  const projectContextPath = path.join(SKILL_DIR, 'references', 'project-context.json');
  const cliCommands = discoverCliCommands(paths.cwd);

  const inputs = { project_context: projectContextPath };
  const context = { changed_files: changedFiles, cli: cliCommands };

  acquireLock(paths.lockFile, 'self-checker');
  let checkerRun;
  try {
    checkerRun = runWorker(run, paths, 'self-checker', inputs, context);
  } finally {
    releaseLock(paths.lockFile);
  }

  if (!checkerRun.ok) {
    return { status: 'failed', reason: `self-checker failed: ${checkerRun.reason}` };
  }

  const result = checkerRun.result;
  if (result.execution_status === 'failed') {
    return { status: 'failed', reason: `self-checker: ${result.summary}` };
  }

  // Update changed files
  const additionalFiles = result.data.files_changed || [];
  const allFiles = new Set([...changedFiles, ...additionalFiles]);
  run._changed_files = Array.from(allFiles);

  run.current_phase = 'cli_repair';
  return { status: 'ok' };
}

// Phase: cli_repair (loop)
function runCliRepair(run, paths) {
  run.current_phase = 'cli_repair';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'cli-checker', 'running'));
  persistRun(run, paths.runJson);

  let cliIteration = run.iterations.cli;

  while (cliIteration < CLI_REPAIR_CAP) {
    // Run cli-checker
    const cliArtifactDir = path.join(paths.artifactsDir, 'cli');
    fs.mkdirSync(cliArtifactDir, { recursive: true });

    const checkerInputs = {};
    const checkerContext = {
      project_root: paths.cwd,
      changed_files: run._changed_files || [],
      iteration: cliIteration,
    };

    acquireLock(paths.lockFile, 'cli-checker');
    let checkerRun;
    try {
      checkerRun = runWorker(run, paths, 'cli-checker', checkerInputs, checkerContext);
    } finally {
      releaseLock(paths.lockFile);
    }

    if (!checkerRun.ok) {
      return { status: 'failed', reason: `cli-checker failed: ${checkerRun.reason}` };
    }

    const checkerResult = checkerRun.result;
    if (checkerResult.execution_status === 'failed') {
      return { status: 'failed', reason: `cli-checker: ${checkerResult.summary}` };
    }

    // Record CLI artifact
    const cliArtifactPath = path.join(cliArtifactDir, `iter-${cliIteration}.json`);
    if (checkerResult.artifacts && checkerResult.artifacts.length > 0) {
      const cliArtifact = checkerResult.artifacts.find(a => a.role === 'cli-report');
      if (cliArtifact) {
        run.artifacts.last_cli_report = path.relative(paths.cwd, cliArtifact.path);
      }
    }

    // Check if CLI is clean
    if (checkerResult.data.result === 'clean' || checkerResult.data.result === 'skipped') {
      if (checkerResult.data.result === 'skipped') {
        // CLI validation was skipped — must finish as completed_with_unresolved_issues
        run.outcome.issues_remaining++;
        appendEvent(paths.eventsJsonl, makeEvent(run, 'warning_recorded', 'cli-checker', 'warning',
          { details: { reason: 'cli-validation-skipped' } }
        ));
      }
      run.iterations.cli = cliIteration;
      run.current_phase = 'validate';
      return { status: 'ok' };
    }

    // Issues found — invoke coder-fix-cli
    const cliReportPath = run.artifacts.last_cli_report
      ? path.join(paths.cwd, run.artifacts.last_cli_report)
      : cliArtifactPath;

    const projectContextPath = path.join(SKILL_DIR, 'references', 'project-context.json');
    const fixInputs = {
      project_context: projectContextPath,
      cli_report: cliReportPath,
    };
    const techReqPath = path.join(paths.inputDir, 'technical-requirements.json');
    if (fs.existsSync(techReqPath)) fixInputs.technical_requirements = techReqPath;

    const fixContext = {
      iteration: cliIteration,
      changed_files: run._changed_files || [],
    };

    acquireLock(paths.lockFile, 'coder-fix-cli');
    let fixRun;
    try {
      fixRun = runWorker(run, paths, 'coder-fix-cli', fixInputs, fixContext);
    } finally {
      releaseLock(paths.lockFile);
    }

    if (!fixRun.ok) {
      return { status: 'failed', reason: `coder-fix-cli failed: ${fixRun.reason}` };
    }

    const fixResult = fixRun.result;
    if (fixResult.execution_status === 'failed') {
      return { status: 'failed', reason: `coder-fix-cli: ${fixResult.summary}` };
    }

    if (fixResult.data.fix_result === 'unresolved') {
      run.outcome.issues_remaining += fixResult.data.remaining_issue_count || 1;
      run.iterations.cli = cliIteration + 1;
      run.current_phase = 'validate';
      return { status: 'ok' };
    }

    // Update changed files
    for (const f of (fixResult.data.files_changed || [])) {
      if (!run._changed_files) run._changed_files = [];
      if (!run._changed_files.includes(f)) run._changed_files.push(f);
    }

    cliIteration++;
    run.iterations.cli = cliIteration;
    run.signals.retry_count++;
    persistRun(run, paths.runJson);
  }

  // CLI cap exhausted — move on with unresolved issues
  run.iterations.cli = cliIteration;
  appendEvent(paths.eventsJsonl, makeEvent(run, 'warning_recorded', 'cli-checker', 'warning',
    { details: { reason: 'cli-cap-exhausted', attempt_limit: CLI_REPAIR_CAP } }
  ));
  run.outcome.issues_remaining++;
  run.current_phase = 'validate';
  return { status: 'ok' };
}

// Phase: validate (run 4 validators then aggregator, loop)
function runValidate(run, paths) {
  run.current_phase = 'validate';
  persistRun(run, paths.runJson);

  let validationIteration = run.iterations.validation;
  const changedFiles = run._changed_files || [];

  while (validationIteration < VALIDATION_REPAIR_CAP) {
    appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'validators', 'running'));

    const techReqPath = path.join(paths.inputDir, 'technical-requirements.json');
    const validatorContext = {
      files: changedFiles,
      iteration: validationIteration,
    };
    const validatorInputs = {};
    if (fs.existsSync(techReqPath)) validatorInputs.technical_requirements = techReqPath;

    const validators = ['validator-structural', 'validator-file', 'validator-security', 'validator-spec'];
    const validatorResultPaths = [];

    // Run validators sequentially (parallel possible since read_only, but sequential for simplicity)
    for (const validatorId of validators) {
      const validatorRun = runWorker(run, paths, validatorId, validatorInputs, validatorContext);

      if (!validatorRun.ok) {
        return { status: 'failed', reason: `${validatorId} failed: ${validatorRun.reason}` };
      }

      const result = validatorRun.result;
      if (result.execution_status === 'failed') {
        return { status: 'failed', reason: `${validatorId}: ${result.summary}` };
      }

      validatorResultPaths.push(validatorRun.resultPath);
    }

    // Run aggregator
    const prevFalsePositivesPath = validationIteration > 0
      ? path.join(paths.artifactsDir, 'validation', `iter-${validationIteration - 1}`, 'false-positives.json')
      : null;

    const aggInputs = { validator_results: validatorResultPaths };
    const aggContext = { iteration: validationIteration };
    if (prevFalsePositivesPath && fs.existsSync(prevFalsePositivesPath)) {
      aggContext.previous_false_positives = prevFalsePositivesPath;
    }

    const aggRun = runWorker(run, paths, 'aggregator', aggInputs, aggContext);

    if (!aggRun.ok) {
      return { status: 'failed', reason: `aggregator failed: ${aggRun.reason}` };
    }

    const aggResult = aggRun.result;
    if (aggResult.execution_status === 'failed') {
      return { status: 'failed', reason: `aggregator: ${aggResult.summary}` };
    }

    // Record validation artifact
    const validationArtifact = (aggResult.artifacts || []).find(a => a.role === 'aggregated-validation');
    if (validationArtifact) {
      run.artifacts.last_validation_report = path.relative(paths.cwd, validationArtifact.path);
    }

    run.iterations.validation = validationIteration;

    // Clean?
    if (aggResult.data.result === 'clean' || aggResult.data.verified_issue_count === 0) {
      run.current_phase = 'improve';
      return { status: 'ok' };
    }

    // Issues found — invoke coder-fix-validation
    const aggregatedPath = validationArtifact
      ? validationArtifact.path
      : path.join(paths.artifactsDir, 'validation', `iter-${validationIteration}`, 'aggregated.json');

    const projectContextPath = path.join(SKILL_DIR, 'references', 'project-context.json');
    const fixInputs = {
      project_context: projectContextPath,
      aggregated_validation: aggregatedPath,
    };
    if (fs.existsSync(techReqPath)) fixInputs.technical_requirements = techReqPath;

    const fixContext = {
      iteration: validationIteration,
      changed_files: changedFiles,
    };

    acquireLock(paths.lockFile, 'coder-fix-validation');
    let fixRun;
    try {
      fixRun = runWorker(run, paths, 'coder-fix-validation', fixInputs, fixContext);
    } finally {
      releaseLock(paths.lockFile);
    }

    if (!fixRun.ok) {
      return { status: 'failed', reason: `coder-fix-validation failed: ${fixRun.reason}` };
    }

    const fixResult = fixRun.result;
    if (fixResult.execution_status === 'failed') {
      return { status: 'failed', reason: `coder-fix-validation: ${fixResult.summary}` };
    }

    if (fixResult.data.fix_result === 'unresolved') {
      run.outcome.issues_remaining += fixResult.data.remaining_issue_count || 1;
      run.iterations.validation = validationIteration + 1;
      run.current_phase = 'improve';
      return { status: 'ok' };
    }

    // Update changed files
    for (const f of (fixResult.data.files_changed || [])) {
      if (!run._changed_files.includes(f)) run._changed_files.push(f);
    }

    validationIteration++;
    run.iterations.validation = validationIteration;
    run.signals.retry_count++;
    persistRun(run, paths.runJson);
  }

  // Validation cap exhausted
  appendEvent(paths.eventsJsonl, makeEvent(run, 'warning_recorded', 'aggregator', 'warning',
    { details: { reason: 'validation-cap-exhausted', attempt_limit: VALIDATION_REPAIR_CAP } }
  ));
  run.outcome.issues_remaining++;
  run.current_phase = 'improve';
  return { status: 'ok' };
}

// Phase: improve
function runImprove(run, paths) {
  run.current_phase = 'improve';
  appendEvent(paths.eventsJsonl, makeEvent(run, 'phase_started', 'improvement-analyzer', 'running'));
  persistRun(run, paths.runJson);

  const inputs = { run_summary: paths.runJson };
  const context = { mode: 'post-run-analysis' };

  const improveRun = runWorker(run, paths, 'improvement-analyzer', inputs, context);

  if (!improveRun.ok || improveRun.result.execution_status === 'failed') {
    // Non-fatal — continue without improvement data
    appendEvent(paths.eventsJsonl, makeEvent(run, 'warning_recorded', 'improvement-analyzer', 'warning',
      { details: { reason: 'improvement-analyzer-failed' } }
    ));
    run.current_phase = 'regression_apply';
    return { status: 'ok' };
  }

  const result = improveRun.result;
  const suggArtifact = (result.artifacts || []).find(a => a.role === 'improvement-suggestions');
  if (suggArtifact) {
    run.artifacts.improvement_suggestions = path.relative(paths.cwd, suggArtifact.path);
  }

  run.current_phase = 'regression_apply';
  return { status: 'ok' };
}

// Phase: regression_apply
function runRegressionApply(run, paths) {
  run.current_phase = 'regression_apply';
  persistRun(run, paths.runJson);

  const suggestionsPath = run.artifacts.improvement_suggestions
    ? path.join(paths.cwd, run.artifacts.improvement_suggestions)
    : path.join(paths.artifactsDir, 'improvement', 'improvement-suggestions.json');

  if (!fs.existsSync(suggestionsPath)) {
    run.current_phase = 'finalize';
    return { status: 'ok' };
  }

  let suggestions;
  try {
    suggestions = JSON.parse(fs.readFileSync(suggestionsPath, 'utf8'));
  } catch (_) {
    run.current_phase = 'finalize';
    return { status: 'ok' };
  }

  const regressions = suggestions.regressions || [];
  if (regressions.length === 0) {
    run.current_phase = 'finalize';
    return { status: 'ok' };
  }

  const applyResultsPath = path.join(paths.artifactsDir, 'improvement', 'regression-apply-results.json');

  // Load existing results for resume idempotency
  const appliedItems = new Set();
  if (fs.existsSync(applyResultsPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(applyResultsPath, 'utf8'));
      for (const item of (existing.items || [])) {
        if (item.status === 'applied') appliedItems.add(item.item_index);
      }
    } catch (_) {}
  }

  const resultItems = [];
  const decisionsPath = path.join(os.homedir(), '.claude', 'agent-memory', 'improvement-analyzer', 'decisions.md');

  for (let idx = 0; idx < regressions.length; idx++) {
    if (appliedItems.has(idx)) {
      resultItems.push({ item_index: idx, target_file: regressions[idx].target_file, action: regressions[idx].action, status: 'applied', reason: 'already applied on previous resume' });
      continue;
    }

    const item = regressions[idx];
    const targetPath = path.isAbsolute(item.target_file) ? item.target_file : path.join(paths.cwd, item.target_file);

    if (!fs.existsSync(targetPath)) {
      resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: 'target file not found' });
      continue;
    }

    let content = fs.readFileSync(targetPath, 'utf8');

    try {
      if (item.action === 'replace') {
        if (!item.old_text) { resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: 'old_text missing' }); continue; }
        if (!content.includes(item.old_text)) { resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: 'old_text not found in file' }); continue; }
        content = content.replace(item.old_text, item.new_text || '');
        atomicWrite(targetPath, content);
      } else if (item.action === 'insert') {
        if (!item.new_text) { resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: 'new_text missing' }); continue; }
        content = content + '\n' + item.new_text;
        atomicWrite(targetPath, content);
      } else if (item.action === 'delete') {
        if (!item.old_text) { resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: 'old_text missing' }); continue; }
        if (!content.includes(item.old_text)) { resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: 'old_text not found in file' }); continue; }
        content = content.replace(item.old_text, '');
        atomicWrite(targetPath, content);
      }

      resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'applied' });

      // Record in decisions.md
      try {
        fs.mkdirSync(path.dirname(decisionsPath), { recursive: true });
        const date = new Date().toISOString().slice(0, 10);
        const entry = `\n- [${date}] ${item.target_file}: ${item.description} (auto-applied regression)\n`;
        if (!fs.existsSync(decisionsPath)) fs.writeFileSync(decisionsPath, '## Accepted\n', 'utf8');
        const existing = fs.readFileSync(decisionsPath, 'utf8');
        if (!existing.includes('## Accepted')) {
          fs.appendFileSync(decisionsPath, '\n## Accepted\n');
        }
        fs.appendFileSync(decisionsPath, entry);
      } catch (_) {}

    } catch (e) {
      resultItems.push({ item_index: idx, target_file: item.target_file, action: item.action, status: 'skipped', reason: `Apply error: ${e.message}` });
    }
  }

  // Write regression apply results
  try {
    fs.mkdirSync(path.dirname(applyResultsPath), { recursive: true });
    atomicWrite(applyResultsPath, {
      version: 1,
      run_id: run.run_id,
      items: resultItems,
    });
    run.artifacts.regression_apply_results = path.relative(paths.cwd, applyResultsPath);
  } catch (e) {
    appendEvent(paths.eventsJsonl, makeEvent(run, 'warning_recorded', '', 'warning',
      { details: { reason: `regression-apply-results-write-failed: ${e.message}` } }
    ));
  }

  run.current_phase = 'finalize';
  return { status: 'ok' };
}

// Phase: finalize
function runFinalize(run, paths) {
  run.current_phase = 'finalize';
  persistRun(run, paths.runJson);

  // Compute final status
  if (run.outcome.issues_remaining === 0 && run.outcome.unresolved_workers === 0) {
    run.status = 'completed';
  } else {
    run.status = 'completed_with_unresolved_issues';
  }

  // Write final run.json
  run.current_phase = null;
  run.current_worker = null;
  run.cost.duration_ms = Date.now() - run._start_time;
  persistRun(run, paths.runJson);

  // Append run_finished event
  appendEvent(paths.eventsJsonl, {
    version: 1,
    timestamp: new Date().toISOString(),
    run_id: run.run_id,
    phase: 'finalize',
    worker_id: '',
    attempt: 1,
    event_type: 'run_finished',
    status: run.status,
  });

  // Write user report
  const report = buildUserReport(run, paths);
  fs.mkdirSync(paths.logsDir, { recursive: true });
  atomicWrite(paths.userReport, report);
  run.artifacts.user_report = path.relative(paths.cwd, paths.userReport);
  persistRun(run, paths.runJson);

  return { status: 'ok' };
}

// ─── User Report ──────────────────────────────────────────────────────────────

function buildUserReport(run, paths) {
  const lines = [];
  const statusLabel = {
    completed: 'Completed',
    completed_with_unresolved_issues: 'Completed with unresolved issues',
    failed: 'Failed',
  }[run.status] || run.status;

  lines.push(`# Feature Implementation: ${run.feature}`);
  lines.push('');
  lines.push(`**Status:** ${statusLabel}`);
  lines.push(`**Run ID:** ${run.run_id}`);
  lines.push(`**Duration:** ${Math.round(run.cost.duration_ms / 1000)}s`);
  lines.push('');

  if (run.status === 'completed') {
    lines.push(`Completed ${run.progress.completed_steps} implementation steps.`);
    if (run.iterations.cli > 0) lines.push(`CLI repair: ${run.iterations.cli} iteration(s).`);
    if (run.iterations.validation > 0) lines.push(`Validation repair: ${run.iterations.validation} iteration(s).`);
  }

  if (run.status === 'completed_with_unresolved_issues') {
    lines.push(`Completed ${run.progress.completed_steps} of ${run.progress.total_steps || '?'} implementation steps.`);
    lines.push(`**Unresolved issues:** ${run.outcome.issues_remaining}`);
    lines.push('');
    lines.push('Run with resolved issues was not achievable within iteration caps. Review the validation report and fix remaining issues manually.');
    if (run.artifacts.last_validation_report) {
      lines.push(`Last validation report: \`${run.artifacts.last_validation_report}\``);
    }
  }

  if (run.status === 'failed') {
    lines.push('The run failed before completing all phases.');
    lines.push(`Check \`${path.relative(paths.cwd, paths.eventsJsonl)}\` for details.`);
  }

  if (run.signals.compactions > 0) {
    lines.push('');
    lines.push(`**Warning:** ${run.signals.compactions} context compaction(s) occurred. Consider running \`/system-improve\`.`);
  }

  if (run.artifacts.improvement_suggestions) {
    lines.push('');
    lines.push(`**System suggestion:** \`/system-improve ${run.artifacts.improvement_suggestions}\``);
  }

  return lines.join('\n') + '\n';
}

// ─── CLI Command Discovery ────────────────────────────────────────────────────

function discoverCliCommands(cwd) {
  const commands = { lint: '', typecheck: '', test: '' };

  // Try package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const scripts = pkg.scripts || {};
      if (scripts.lint) commands.lint = 'npm run lint';
      if (scripts.typecheck || scripts['type-check']) commands.typecheck = 'npm run typecheck';
      if (scripts.test) commands.test = 'npm run test';
    } catch (_) {}
  }

  return commands;
}

// ─── Phase Machine ────────────────────────────────────────────────────────────

function runPhaseMachine(run, paths, preprocessOnly) {
  const phaseHandlers = {
    preprocess: () => runPreprocess(run, paths),
    plan: () => runPlan(run, paths),
    test_write: () => runTestWrite(run, paths),
    implement: () => runImplement(run, paths),
    self_check: () => runSelfCheck(run, paths),
    cli_repair: () => runCliRepair(run, paths),
    validate: () => runValidate(run, paths),
    improve: () => runImprove(run, paths),
    regression_apply: () => runRegressionApply(run, paths),
    finalize: () => runFinalize(run, paths),
  };

  while (run.status === 'running' && run.current_phase) {
    // Check total timeout
    if (Date.now() - run._start_time > TOTAL_TIMEOUT_MS) {
      run.status = 'failed';
      appendEvent(paths.eventsJsonl, makeEvent(run, 'run_finished', '', 'failed',
        { details: { reason: 'total-timeout-exceeded' } }
      ));
      break;
    }

    const phase = run.current_phase;
    const handler = phaseHandlers[phase];
    if (!handler) {
      console.error(`Unknown phase: ${phase}`);
      run.status = 'failed';
      break;
    }

    let phaseResult;
    try {
      phaseResult = handler();
    } catch (e) {
      console.error(`Phase ${phase} threw: ${e.message}`);
      phaseResult = { status: 'failed', reason: e.message };
    }

    if (phaseResult.status === 'failed') {
      run.status = 'failed';
      run.current_phase = null;
      persistRun(run, paths.runJson);

      appendEvent(paths.eventsJsonl, {
        version: 1,
        timestamp: new Date().toISOString(),
        run_id: run.run_id,
        phase,
        worker_id: '',
        attempt: 1,
        event_type: 'run_finished',
        status: 'failed',
        details: { reason: phaseResult.reason },
      });

      // Write failure report
      const report = buildUserReport(run, paths);
      fs.mkdirSync(paths.logsDir, { recursive: true });
      atomicWrite(paths.userReport, report);
      run.artifacts.user_report = path.relative(paths.cwd, paths.userReport);
      persistRun(run, paths.runJson);
      break;
    }

    if (phaseResult.status === 'unresolved') {
      // Implementation unresolved — skip to improve
      run.current_phase = 'improve';
      persistRun(run, paths.runJson);
      continue;
    }

    // Persist after each successful phase
    persistRun(run, paths.runJson);

    // If preprocess-only mode — stop after preprocess
    if (preprocessOnly && phase === 'preprocess') {
      run.status = 'completed';
      run.current_phase = null;
      persistRun(run, paths.runJson);
      appendEvent(paths.eventsJsonl, {
        version: 1,
        timestamp: new Date().toISOString(),
        run_id: run.run_id,
        phase: 'preprocess',
        worker_id: '',
        attempt: 1,
        event_type: 'run_finished',
        status: 'completed',
        details: { reason: 'preprocess-only' },
      });
      break;
    }

    // finalize marks itself complete
    if (phase === 'finalize') {
      break;
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs();
  const paths = resolvePaths(args);

  // Determine if this is a resume
  const isResume = fs.existsSync(paths.runJson);

  if (!isResume) {
    checkGitClean(paths.cwd);
  }

  // Setup runtime directories
  fs.mkdirSync(paths.runtimeDir, { recursive: true });
  fs.mkdirSync(paths.inputDir, { recursive: true });
  fs.mkdirSync(paths.tasksDir, { recursive: true });
  fs.mkdirSync(paths.resultsDir, { recursive: true });
  fs.mkdirSync(paths.artifactsDir, { recursive: true });
  fs.mkdirSync(paths.logsDir, { recursive: true });

  // Load or create run state
  let run;
  if (isResume) {
    run = loadRun(paths.runJson);
    console.log(`Resuming run ${run.run_id} from phase: ${run.current_phase}`);
    // Skip preprocess if already done
    if (args.preprocessOnly && run.current_phase !== 'preprocess') {
      console.log('Run already past preprocess phase. Nothing to do.');
      return;
    }
  } else {
    const runId = `${args.feature}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}Z`;
    run = createRun(args.feature, runId);
    atomicWrite(paths.runJson, { ...run, _start_time: undefined });

    appendEvent(paths.eventsJsonl, {
      version: 1,
      timestamp: new Date().toISOString(),
      run_id: run.run_id,
      phase: 'preprocess',
      worker_id: '',
      attempt: 1,
      event_type: 'run_started',
      status: 'running',
    });

    console.log(`Starting run: ${run.run_id}`);
  }

  // Run the phase machine
  runPhaseMachine(run, paths, args.preprocessOnly);

  // Print final status
  const finalRun = readResult(paths.runJson) || run;
  console.log(`\nRun ${finalRun.run_id}: ${finalRun.status}`);

  if (fs.existsSync(paths.userReport)) {
    console.log('\n' + fs.readFileSync(paths.userReport, 'utf8'));
  }
}

main();
