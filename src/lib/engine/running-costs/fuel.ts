import { basisPointsToRate, roundToCents, type Cents } from "../money";
import type {
  FuelPrices,
  Powertrain,
  RunningCostInput,
  RunningCostRates,
} from "../schemas";

const CONSUMPTION_DISTANCE_KM = 100;

const FUEL_BY_POWERTRAIN = {
  petrol: "petrol",
  diesel: "diesel",
  hybrid: "petrol",
  plugInHybrid: "petrol",
} as const satisfies Record<Exclude<Powertrain, "electric">, keyof FuelPrices>;

function energyPriceCents(
  { powertrain, region }: RunningCostInput,
  rates: RunningCostRates,
): Cents {
  if (powertrain === "electric") {
    return rates.electricityTariffCentsPerKwh;
  }
  return rates.fuelPriceCentsPerLitre[region][FUEL_BY_POWERTRAIN[powertrain]];
}

function realWorldConsumption(
  { powertrain, claimedConsumption }: RunningCostInput,
  { consumptionUpliftBpsByPowertrain }: RunningCostRates,
): number {
  const uplift = basisPointsToRate(
    consumptionUpliftBpsByPowertrain[powertrain],
  );
  return claimedConsumption * (1 + uplift);
}

export function calculateMonthlyFuel(
  input: RunningCostInput,
  rates: RunningCostRates,
): Cents {
  const energyUsed =
    (input.kmPerMonth / CONSUMPTION_DISTANCE_KM) *
    realWorldConsumption(input, rates);
  return roundToCents(energyUsed * energyPriceCents(input, rates));
}
