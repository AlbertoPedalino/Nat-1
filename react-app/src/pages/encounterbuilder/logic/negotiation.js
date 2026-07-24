export const DEFAULT_NPC_ATTITUDE = 'neutral';
export const MIN_INTEREST = 1;
export const MAX_INTEREST = 5;
export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 99;

export const NPC_ATTITUDES = Object.freeze([
  { id: 'hostile', label: 'Hostile', patience: 2, interest: 1 },
  { id: 'neutral', label: 'Neutral', patience: 3, interest: 2 },
  { id: 'friendly', label: 'Friendly', patience: 4, interest: 3 },
]);

export const NEGOTIATION_ACTIONS = Object.freeze({
  passed: Object.freeze({
    id: 'passed',
    label: 'Threshold passed',
    patienceDelta: 0,
    interestDelta: 1,
  }),
  failed: Object.freeze({
    id: 'failed',
    label: 'Threshold not passed',
    patienceDelta: -1,
    interestDelta: -1,
  }),
  criticalSuccess: Object.freeze({
    id: 'criticalSuccess',
    label: 'Critical success',
    patienceDelta: 0,
    interestDelta: 3,
  }),
  criticalFailure: Object.freeze({
    id: 'criticalFailure',
    label: 'Critical failure',
    patienceDelta: -2,
    interestDelta: -2,
  }),
});

export const NEGOTIATION_RESULTS = Object.freeze({
  1: 'No, with negative consequences.',
  2: 'No, with positive consequences.',
  3: 'Yes, with negative consequences.',
  4: 'Yes.',
  5: 'Yes, with positive consequences.',
});

export function getNpcAttitude(attitudeId) {
  return NPC_ATTITUDES.find((item) => item.id === attitudeId)
    || NPC_ATTITUDES.find((item) => item.id === DEFAULT_NPC_ATTITUDE);
}

export function createDefaultNegotiation(attitudeId = DEFAULT_NPC_ATTITUDE, threshold = null) {
  const attitude = getNpcAttitude(attitudeId);
  return {
    attitude: attitude.id,
    threshold: normalizeNegotiationThreshold(threshold),
    patience: attitude.patience,
    interest: attitude.interest,
  };
}

export function normalizeNegotiationThreshold(value) {
  if (value === '' || value == null) return null;
  const parsed = Math.trunc(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, parsed));
}

export function normalizeNegotiation(value) {
  const attitude = getNpcAttitude(value?.attitude);
  return {
    attitude: attitude.id,
    threshold: normalizeNegotiationThreshold(value?.threshold),
    patience: clampInt(value?.patience, 0, attitude.patience, attitude.patience),
    interest: clampInt(value?.interest, MIN_INTEREST, MAX_INTEREST, attitude.interest),
  };
}

export function negotiationStatus(value) {
  const negotiation = normalizeNegotiation(value);
  const ended = negotiation.patience === 0 || negotiation.interest === MAX_INTEREST;
  return {
    ended,
    reason: negotiation.interest === MAX_INTEREST
      ? 'Maximum interest reached.'
      : negotiation.patience === 0
        ? 'Patience exhausted.'
        : '',
    result: ended ? NEGOTIATION_RESULTS[negotiation.interest] : '',
  };
}

export function resolveNegotiation(value, actionId) {
  const negotiation = normalizeNegotiation(value);
  if (negotiationStatus(negotiation).ended) return negotiation;
  const action = NEGOTIATION_ACTIONS[actionId];
  if (!action) return negotiation;
  return {
    ...negotiation,
    patience: Math.max(0, negotiation.patience + action.patienceDelta),
    interest: Math.max(
      MIN_INTEREST,
      Math.min(MAX_INTEREST, negotiation.interest + action.interestDelta),
    ),
  };
}

function clampInt(value, min, max, fallback) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
