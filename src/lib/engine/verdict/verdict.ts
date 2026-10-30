import {
  cents,
  ratioInBasisPointsRoundedDown,
  ratioInBasisPointsRoundedUp,
  type BasisPoints,
  type Cents,
} from "../money";
import type { VerdictThresholds } from "../schemas";

export type VerdictStatus = "comfortable" | "stretched" | "unaffordable";

export type VerdictReason = "CAR_COST_SHARE_HIGH" | "BUFFER_LOW";

export type VerdictCheck = {
  status: VerdictStatus;
  valueBps: BasisPoints;
};

export type VerdictChecks = {
  carCostShare: VerdictCheck;
  buffer: VerdictCheck;
};

export type Verdict = {
  status: VerdictStatus;
  checks: VerdictChecks;
  reasons: VerdictReason[];
};

export type MonthlyBudget = {
  netIncomeCents: Cents;
  expensesCents: Cents;
  carCostCents: Cents;
};

const SEVERITY: Record<VerdictStatus, number> = {
  comfortable: 0,
  stretched: 1,
  unaffordable: 2,
};

type CheckReason = readonly [keyof VerdictChecks, VerdictReason];

const REASON_BY_CHECK: readonly CheckReason[] = [
  ["carCostShare", "CAR_COST_SHARE_HIGH"],
  ["buffer", "BUFFER_LOW"],
];

function carCostShareStatus(
  valueBps: BasisPoints,
  {
    comfortableBelowBps,
    unaffordableAboveBps,
  }: VerdictThresholds["carCostShare"],
): VerdictStatus {
  if (valueBps > unaffordableAboveBps) {
    return "unaffordable";
  }
  return valueBps < comfortableBelowBps ? "comfortable" : "stretched";
}

function bufferStatus(
  valueBps: BasisPoints,
  { comfortableFromBps, unaffordableBelowBps }: VerdictThresholds["buffer"],
): VerdictStatus {
  if (valueBps < unaffordableBelowBps) {
    return "unaffordable";
  }
  return valueBps >= comfortableFromBps ? "comfortable" : "stretched";
}

function checkCarCostShare(
  { netIncomeCents, carCostCents }: MonthlyBudget,
  limits: VerdictThresholds["carCostShare"],
): VerdictCheck {
  const valueBps = ratioInBasisPointsRoundedUp(carCostCents, netIncomeCents);
  return { status: carCostShareStatus(valueBps, limits), valueBps };
}

function checkBuffer(
  { netIncomeCents, expensesCents, carCostCents }: MonthlyBudget,
  limits: VerdictThresholds["buffer"],
): VerdictCheck {
  const valueBps = ratioInBasisPointsRoundedDown(
    cents(netIncomeCents - expensesCents - carCostCents),
    netIncomeCents,
  );
  return { status: bufferStatus(valueBps, limits), valueBps };
}

function worseOf(first: VerdictStatus, second: VerdictStatus): VerdictStatus {
  return SEVERITY[second] > SEVERITY[first] ? second : first;
}

function reasonsFor(checks: VerdictChecks): VerdictReason[] {
  return REASON_BY_CHECK.filter(
    ([check]) => checks[check].status !== "comfortable",
  ).map(([, reason]) => reason);
}

export function determineVerdict(
  budget: MonthlyBudget,
  thresholds: VerdictThresholds,
): Verdict {
  const checks: VerdictChecks = {
    carCostShare: checkCarCostShare(budget, thresholds.carCostShare),
    buffer: checkBuffer(budget, thresholds.buffer),
  };
  return {
    status: worseOf(checks.carCostShare.status, checks.buffer.status),
    checks,
    reasons: reasonsFor(checks),
  };
}
