import {
  calculateBalloon,
  calculatePrincipal,
  type FinanceInput,
} from "./finance";
import type { BasisPoints, Cents } from "./money";

export type FinanceRules = {
  readonly maxBalloonVehicleAgeYears: number;
  readonly balloonWarningBps: BasisPoints;
};

export type FinanceError =
  | { code: "NOTHING_TO_FINANCE"; principalCents: Cents }
  | {
      code: "BALLOON_EXCEEDS_PRINCIPAL";
      balloonCents: Cents;
      principalCents: Cents;
    }
  | {
      code: "BALLOON_NOT_ALLOWED_FOR_AGE";
      vehicleAgeYears: number;
      maxBalloonVehicleAgeYears: number;
    };

export type FinanceWarning = {
  code: "HIGH_BALLOON";
  balloonBps: BasisPoints;
  balloonWarningBps: BasisPoints;
};

export type FinanceIssue = FinanceError | FinanceWarning;
export type FinanceIssueCode = FinanceIssue["code"];

export type FinanceValidation = {
  errors: FinanceError[];
  warnings: FinanceWarning[];
};

type FinanceFacts = {
  input: FinanceInput;
  rules: FinanceRules;
  principalCents: Cents;
  balloonCents: Cents;
  vehicleAgeYears: number;
};

type Check<Issue> = (facts: FinanceFacts) => Issue | undefined;

const checkNothingToFinance: Check<FinanceError> = ({ principalCents }) =>
  principalCents <= 0
    ? { code: "NOTHING_TO_FINANCE", principalCents }
    : undefined;

const checkBalloonWithinPrincipal: Check<FinanceError> = ({
  balloonCents,
  principalCents,
}) =>
  balloonCents > 0 && balloonCents > principalCents
    ? { code: "BALLOON_EXCEEDS_PRINCIPAL", balloonCents, principalCents }
    : undefined;

const checkBalloonVehicleAge: Check<FinanceError> = ({
  balloonCents,
  vehicleAgeYears,
  rules: { maxBalloonVehicleAgeYears },
}) =>
  balloonCents > 0 && vehicleAgeYears > maxBalloonVehicleAgeYears
    ? {
        code: "BALLOON_NOT_ALLOWED_FOR_AGE",
        vehicleAgeYears,
        maxBalloonVehicleAgeYears,
      }
    : undefined;

const checkHighBalloon: Check<FinanceWarning> = ({
  input: {
    purchase: { balloonBps },
  },
  rules: { balloonWarningBps },
}) =>
  balloonBps > balloonWarningBps
    ? { code: "HIGH_BALLOON", balloonBps, balloonWarningBps }
    : undefined;

const errorChecks = [
  checkNothingToFinance,
  checkBalloonWithinPrincipal,
  checkBalloonVehicleAge,
];
const warningChecks = [checkHighBalloon];

function collect<Issue>(
  checks: readonly Check<Issue>[],
  facts: FinanceFacts,
): Issue[] {
  return checks
    .map((check) => check(facts))
    .filter((issue): issue is Issue => issue !== undefined);
}

export function validateFinance(
  input: FinanceInput,
  rules: FinanceRules,
  currentYear: number,
): FinanceValidation {
  const facts: FinanceFacts = {
    input,
    rules,
    principalCents: calculatePrincipal(input),
    balloonCents: calculateBalloon(input),
    vehicleAgeYears: currentYear - input.vehicle.modelYear,
  };

  return {
    errors: collect(errorChecks, facts),
    warnings: collect(warningChecks, facts),
  };
}
