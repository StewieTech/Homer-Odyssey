'use strict';

const { API_VERSION, EXIT } = require('./constants');
const { HomerError } = require('./errors');
const { assertContract } = require('./schema');
const { hashObject, sortedUnique } = require('./stable');

const TRIGGER_CHANNEL = Object.freeze({
  manual: 'manual',
  'stable-package-event': 'stable-package',
  schedule: 'scheduled',
});

const SAFE_FAILURE_CATEGORIES = new Set([
  'authentication', 'authorization', 'repository_unavailable', 'invalid_profile',
  'dependency_conflict', 'protected_file_conflict', 'privilege_increase',
  'policy_violation', 'validation_failure', 'workflow_failure', 'rate_limited',
  'provider_failure', 'internal_error',
]);

const RETRYABLE_FAILURES = new Set(['rate_limited', 'provider_failure', 'repository_unavailable']);
const TRIGGER_KEYS = new Set(['type', 'requestedBy', 'workflowId', 'sourceCommit', 'packageVersions', 'targetIds']);

function invalid(message, details = []) {
  return new HomerError(message, EXIT.INVALID_CONTRACT, details);
}

function containsCredential(value) {
  return typeof value === 'string'
    && /(?:\bgh[pousr]_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\b(?:token|password|secret)\s*[:=])/i.test(value);
}

function normalizePackageVersions(values) {
  if (!Array.isArray(values) || values.length === 0) throw invalid('Drift orchestration requires at least one stable package version');
  const byId = new Map();
  for (const item of values) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw invalid('Package version entries must be objects');
    if (!/^(?:character|skill):[A-Za-z0-9._/-]+$/.test(item.id || '')) throw invalid(`Invalid stable package id: ${item.id || '<missing>'}`);
    if (typeof item.version !== 'string' || !item.version.trim()) throw invalid(`Missing stable version for ${item.id}`);
    if (containsCredential(item.version)) throw invalid('Package version metadata must not contain credentials');
    const normalized = { id: item.id, version: item.version.trim() };
    const previous = byId.get(normalized.id);
    if (previous && previous.version !== normalized.version) throw invalid(`Conflicting versions for ${normalized.id}`);
    byId.set(normalized.id, normalized);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeTrigger(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('Drift trigger must be an object');
  const unknown = Object.keys(value).filter((key) => !TRIGGER_KEYS.has(key));
  if (unknown.length) throw invalid('Drift trigger contains unsupported inputs', unknown);
  if (!Object.hasOwn(TRIGGER_CHANNEL, value.type)) throw invalid(`Unsupported drift trigger: ${value.type || '<missing>'}`);
  for (const key of ['requestedBy', 'workflowId', 'sourceCommit']) {
    if (typeof value[key] !== 'string' || !value[key].trim()) throw invalid(`Drift trigger requires ${key}`);
    if (containsCredential(value[key])) throw invalid(`Drift trigger ${key} must not contain credentials`);
  }
  const targetIds = value.targetIds === undefined ? [] : value.targetIds;
  if (!Array.isArray(targetIds) || targetIds.some((item) => typeof item !== 'string' || !item)) {
    throw invalid('targetIds must be an array of registered target ids');
  }
  return {
    type: value.type,
    requestedBy: value.requestedBy.trim(),
    workflowId: value.workflowId.trim(),
    sourceCommit: value.sourceCommit.trim(),
    packageVersions: normalizePackageVersions(value.packageVersions),
    targetIds: sortedUnique(targetIds),
  };
}

function assertLimits(limits) {
  const checks = [
    ['maxTargetsPerRun', 1, 32],
    ['concurrency', 1, 8],
    ['maxRetries', 0, 4],
    ['maxRateLimitWaitMs', 0, 60000],
  ];
  for (const [key, minimum, maximum] of checks) {
    if (!Number.isInteger(limits[key]) || limits[key] < minimum || limits[key] > maximum) {
      throw invalid(`Registry limit ${key} must be an integer from ${minimum} to ${maximum}`);
    }
  }
}

function normalizeRegistry(value) {
  const registry = assertContract('odyssey-target-registry', value);
  assertLimits(registry.limits);
  const ids = registry.targets.map((target) => target.id);
  if (new Set(ids).size !== ids.length) throw invalid('Target registry ids must be unique');
  return registry;
}

function packagePatternMatches(pattern, packageId) {
  if (pattern.endsWith('*')) return packageId.startsWith(pattern.slice(0, -1));
  return pattern === packageId;
}

function targetIsCompatible(target, packageVersions) {
  return packageVersions.every((item) => target.compatiblePackages.some((pattern) => packagePatternMatches(pattern, item.id)));
}

function targetStateFor(state, targetId) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const targets = state.targets && typeof state.targets === 'object' ? state.targets : state;
  const value = targets[targetId];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.targetCommit !== 'string' || !value.targetCommit || typeof value.targetLockHash !== 'string' || !value.targetLockHash) return null;
  return value;
}

function safeEvidenceLink(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['github.com', 'api.github.com'].includes(url.hostname)) return null;
    url.username = '';
    url.password = '';
    return url.toString();
  } catch { return null; }
}

function evidenceLinksFrom(value) {
  const links = [];
  const candidates = Array.isArray(value) ? value : [];
  for (const item of candidates) {
    const candidate = typeof item === 'string' ? item : item?.url;
    const safe = safeEvidenceLink(candidate);
    if (safe) links.push(safe);
  }
  return sortedUnique(links);
}

function sanitizeSafeValue(value, key = '') {
  if (/token|password|secret|authorization|cookie|contentBase64|rawLog|providerLog/i.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => sanitizeSafeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitizeSafeValue(child, childKey)]));
  }
  if (typeof value === 'string') {
    return value
      .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[REDACTED]')
      .replace(/\b(?:token|password|secret)\s*[:=]\s*\S+/gi, '[REDACTED]');
  }
  return value;
}

function equivalentRecord(records, dedupeKey, { allowUnkeyed = false } = {}) {
  if (!Array.isArray(records)) return null;
  return records.find((item) => item && item.active !== false && item.open !== false
    && (item.dedupeKey === dedupeKey || (allowUnkeyed && !item.dedupeKey))) || null;
}

function dedupeKeyFor(target, trigger, targetState) {
  return hashObject({
    repository: target.repository,
    targetRef: target.targetRef,
    profile: target.profile,
    channel: target.channel,
    sourcePackageVersions: trigger.packageVersions,
    targetLockHash: targetState?.targetLockHash || 'missing',
    policyHash: target.policyHash,
  });
}

function decisionFor(target, trigger, targetState, bounded) {
  const dedupeKey = dedupeKeyFor(target, trigger, targetState);
  const base = {
    targetId: target.id,
    repository: target.repository,
    targetRef: target.targetRef,
    profile: target.profile,
    channel: target.channel,
    targetCommit: targetState?.targetCommit || null,
    targetLockHash: targetState?.targetLockHash || null,
    dedupeKey,
    evidenceLinks: [],
    request: null,
  };
  if (!targetIsCompatible(target, trigger.packageVersions)) {
    return { ...base, status: 'suppressed', dedupeDecision: 'incompatible' };
  }
  if (!targetState) return { ...base, status: 'blocked', dedupeDecision: 'missing_target_state' };
  if (!bounded) return { ...base, status: 'blocked', dedupeDecision: 'bounded_limit' };

  const openUpdate = equivalentRecord(targetState.openUpdates, dedupeKey, { allowUnkeyed: true });
  if (openUpdate) {
    return { ...base, status: 'suppressed', dedupeDecision: 'open_update', evidenceLinks: evidenceLinksFrom([openUpdate]) };
  }
  const dismissal = equivalentRecord(targetState.dismissedUpdates, dedupeKey);
  if (dismissal) {
    return { ...base, status: 'dismissed', dedupeDecision: 'dismissed', evidenceLinks: evidenceLinksFrom([dismissal]) };
  }
  const active = equivalentRecord(targetState.activeRuns, dedupeKey);
  if (active) {
    return { ...base, status: 'suppressed', dedupeDecision: 'active_equivalent', evidenceLinks: evidenceLinksFrom([active]) };
  }
  const completed = equivalentRecord(targetState.completedChecks, dedupeKey);
  if (completed) {
    return { ...base, status: 'suppressed', dedupeDecision: 'completed_equivalent', evidenceLinks: evidenceLinksFrom([completed]) };
  }

  const request = assertContract('odyssey-operation-request', {
    apiVersion: API_VERSION,
    kind: 'OdysseyOperationRequest',
    operation: 'check-drift',
    targetRepository: target.repository,
    targetRef: target.targetRef,
    profile: target.profile,
    updateChannel: TRIGGER_CHANNEL[trigger.type],
    requestedBy: trigger.requestedBy,
    dryRun: true,
    idempotencyKey: `drift-${dedupeKey.slice(0, 32)}`,
    packageFilters: [...target.packageFilters].sort(),
  });
  return { ...base, status: 'queued', dedupeDecision: 'queued', request };
}

function planDriftChecks({ registry: registryValue, trigger: triggerValue, state = {} }) {
  const registry = normalizeRegistry(registryValue);
  const trigger = normalizeTrigger(triggerValue);
  const requestedIds = new Set(trigger.targetIds);
  const knownIds = new Set(registry.targets.map((target) => target.id));
  const unknownIds = trigger.targetIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length) throw invalid('Drift trigger requested unregistered targets', unknownIds);

  const selected = registry.targets.filter((target) => target.enabled !== false
    && (!requestedIds.size || requestedIds.has(target.id)));
  let boundedCount = 0;
  const decisions = selected.map((target) => {
    const targetState = targetStateFor(state, target.id);
    const compatible = targetIsCompatible(target, trigger.packageVersions);
    const bounded = !compatible || !targetState || boundedCount < registry.limits.maxTargetsPerRun;
    if (compatible && targetState && bounded) boundedCount += 1;
    return decisionFor(target, trigger, targetState, bounded);
  });
  const count = (status) => decisions.filter((item) => item.status === status).length;
  const outputTrigger = {
    type: trigger.type,
    requestedBy: trigger.requestedBy,
    workflowId: trigger.workflowId,
    sourceCommit: trigger.sourceCommit,
    packageVersions: trigger.packageVersions,
  };
  const artifact = {
    apiVersion: API_VERSION,
    kind: 'OdysseyDriftOrchestration',
    orchestrationId: hashObject({ trigger: outputTrigger, registry: registry.targets.map((target) => target.id) }).slice(0, 24),
    trigger: outputTrigger,
    limits: registry.limits,
    summary: {
      registered: registry.targets.length,
      eligible: decisions.filter((item) => !['incompatible', 'missing_target_state'].includes(item.dedupeDecision)).length,
      queued: count('queued'),
      suppressed: count('suppressed'),
      dismissed: count('dismissed'),
      blocked: count('blocked'),
    },
    decisions,
  };
  return assertContract('odyssey-drift-orchestration', artifact);
}

function safeFailureCategory(error) {
  const explicit = error?.failureCategory;
  if (SAFE_FAILURE_CATEGORIES.has(explicit)) return explicit;
  const code = `${error?.code || ''}`.toLowerCase();
  if (code.includes('rate')) return 'rate_limited';
  if (code.includes('provider')) return 'provider_failure';
  return 'internal_error';
}

function operationStatus(response) {
  const status = response?.run?.status;
  if (status === 'no_drift') return 'no-drift';
  if (status === 'drift_detected') return 'drift-detected';
  if (status === 'blocked') return 'blocked';
  if (status === 'failed') return 'failed';
  return 'failed';
}

function statusArtifact({ plan, decision, target, targetState, status, response, failureCategory = null, retryCount = 0, durationMs = 0 }) {
  const responseLinks = [
    ...(response?.artifacts || []),
    ...(response?.run?.evidenceReferences || []),
  ];
  const evidenceLinks = sortedUnique([...decision.evidenceLinks, ...evidenceLinksFrom(responseLinks)]);
  return {
    apiVersion: API_VERSION,
    kind: 'OdysseyDriftStatus',
    runId: response?.run?.runId || `${plan.orchestrationId}-${target.id}`,
    status,
    trigger: plan.trigger.type,
    requester: plan.trigger.requestedBy,
    target: {
      repository: target.repository,
      ref: target.targetRef,
      commit: targetState?.targetCommit || null,
      lockHash: targetState?.targetLockHash || null,
    },
    profile: target.profile,
    source: { commit: plan.trigger.sourceCommit, packageVersions: plan.trigger.packageVersions },
    driftSummary: sanitizeSafeValue(response?.drift?.summary || {}),
    privilegeSummary: sanitizeSafeValue(response?.privilegeDelta || {}),
    policySummary: sanitizeSafeValue(response?.policyDecision || {}),
    workflowId: plan.trigger.workflowId,
    durationMs,
    failureCategory,
    retryCount,
    dedupeDecision: decision.dedupeDecision,
    evidenceLinks,
  };
}

function buildDriftStatusEvidence({ request: requestValue, response, orchestration }) {
  const request = assertContract('odyssey-operation-request', requestValue);
  if (request.operation !== 'check-drift' || request.dryRun !== true) throw invalid('Drift status evidence accepts only read-only check-drift requests');
  if (!orchestration || typeof orchestration !== 'object') throw invalid('Drift status evidence requires orchestration metadata');
  if (!/^[a-f0-9]{64}$/.test(orchestration.dedupeKey || '')) throw invalid('Drift status evidence requires a full dedupe key');
  if (request.idempotencyKey !== `drift-${orchestration.dedupeKey.slice(0, 32)}`) throw invalid('Drift status dedupe and idempotency evidence do not match');
  for (const key of ['workflowId', 'sourceCommit', 'targetCommit', 'targetLockHash']) {
    if (typeof orchestration[key] !== 'string' || !orchestration[key] || containsCredential(orchestration[key])) {
      throw invalid(`Drift status evidence requires safe ${key}`);
    }
  }
  const normalized = normalizeTrigger({
    type: orchestration.trigger,
    requestedBy: request.requestedBy,
    workflowId: orchestration.workflowId,
    sourceCommit: orchestration.sourceCommit,
    packageVersions: orchestration.packageVersions,
  });
  const target = {
    id: orchestration.targetId || `${request.targetRepository}:${request.profile}`,
    repository: request.targetRepository,
    targetRef: request.targetRef,
    profile: request.profile,
  };
  const targetState = { targetCommit: orchestration.targetCommit, targetLockHash: orchestration.targetLockHash };
  const plan = {
    orchestrationId: hashObject({ workflowId: normalized.workflowId, dedupeKey: orchestration.dedupeKey }).slice(0, 24),
    trigger: {
      type: normalized.type,
      requestedBy: normalized.requestedBy,
      workflowId: normalized.workflowId,
      sourceCommit: normalized.sourceCommit,
      packageVersions: normalized.packageVersions,
    },
  };
  const decision = {
    evidenceLinks: evidenceLinksFrom(orchestration.evidenceLinks || []),
    dedupeDecision: 'queued',
  };
  const failureCategory = response?.failureCategory ? safeFailureCategory({ failureCategory: response.failureCategory }) : null;
  const status = statusArtifact({
    plan,
    decision,
    target,
    targetState,
    status: operationStatus(response),
    response,
    failureCategory,
    retryCount: Number.isInteger(orchestration.retryCount) ? Math.max(0, orchestration.retryCount) : 0,
    durationMs: Number.isInteger(orchestration.durationMs) ? Math.max(0, orchestration.durationMs) : 0,
  });
  const notification = {
    apiVersion: API_VERSION,
    kind: 'OdysseyDriftNotification',
    runId: status.runId,
    status: status.status,
    target: status.target.repository,
    profile: status.profile,
    packageVersions: status.source.packageVersions,
    dedupeDecision: status.dedupeDecision,
    failureCategory: status.failureCategory,
    evidenceLinks: status.evidenceLinks,
  };
  return { status, notification };
}

async function executeQueued({ adapter, decision, context, limits, sleep }) {
  const startedAt = Date.now();
  let retries = 0;
  for (;;) {
    try {
      const response = await adapter(decision.request, context);
      const failureCategory = response?.failureCategory ? safeFailureCategory({ failureCategory: response.failureCategory }) : null;
      return { response, status: operationStatus(response), failureCategory, retries, durationMs: Date.now() - startedAt };
    } catch (error) {
      const failureCategory = safeFailureCategory(error);
      if (!RETRYABLE_FAILURES.has(failureCategory) || retries >= limits.maxRetries) {
        return { response: null, status: 'failed', failureCategory, retries, durationMs: Date.now() - startedAt };
      }
      retries += 1;
      const requestedWait = Number.isFinite(error?.retryAfterMs) ? Math.max(0, error.retryAfterMs) : 0;
      await sleep(Math.min(requestedWait, limits.maxRateLimitWaitMs));
    }
  }
}

async function runDriftChecks({ registry: registryValue, trigger, state = {}, adapter, sleep = async () => {} }) {
  if (typeof adapter !== 'function') throw invalid('Drift orchestration requires a check-drift adapter');
  const registry = normalizeRegistry(registryValue);
  const plan = planDriftChecks({ registry, trigger, state });
  const targetById = new Map(registry.targets.map((target) => [target.id, target]));
  const statuses = new Array(plan.decisions.length);
  const queue = [];
  plan.decisions.forEach((decision, index) => {
    const target = targetById.get(decision.targetId);
    const targetState = targetStateFor(state, decision.targetId);
    if (decision.status === 'queued') queue.push({ decision, index, target, targetState });
    else statuses[index] = statusArtifact({
      plan,
      decision,
      target,
      targetState,
      status: decision.status,
    });
  });

  let cursor = 0;
  async function worker() {
    for (;;) {
      const current = cursor;
      cursor += 1;
      if (current >= queue.length) return;
      const item = queue[current];
      const result = await executeQueued({
        adapter,
        decision: item.decision,
        limits: registry.limits,
        sleep,
        context: {
          trigger: plan.trigger,
          target: item.target,
          targetState: item.targetState,
          dedupeKey: item.decision.dedupeKey,
        },
      });
      statuses[item.index] = statusArtifact({
        plan,
        decision: item.decision,
        target: item.target,
        targetState: item.targetState,
        status: result.status,
        response: result.response,
        failureCategory: result.failureCategory,
        retryCount: result.retries,
        durationMs: result.durationMs,
      });
    }
  }

  const workers = Math.min(registry.limits.concurrency, queue.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  const notifications = statuses.map((item) => ({
    runId: item.runId,
    target: item.target.repository,
    profile: item.profile,
    status: item.status,
    dedupeDecision: item.dedupeDecision,
    evidenceLinks: item.evidenceLinks,
  }));
  return { plan, statuses, notifications };
}

module.exports = {
  buildDriftStatusEvidence,
  dedupeKeyFor,
  normalizePackageVersions,
  normalizeRegistry,
  normalizeTrigger,
  planDriftChecks,
  runDriftChecks,
  safeEvidenceLink,
  targetIsCompatible,
};
