/**
 * Carpooling emissions accounting.
 *
 * Replaces the placeholder in the statistics route, which multiplied ride
 * counts by invented constants (2.3 kg per booking, 0.8 per drive) and derived
 * distance the same way (12 km and 15 km per ride). Those numbers were marked
 * "example calculation" in the original code and bore no relation to the
 * journeys actually taken.
 *
 * Method
 * ------
 * The counterfactual for a shared ride is that each passenger would otherwise
 * have driven the same route alone. For a ride of distance D carrying P
 * passengers, the road sees one vehicle instead of P + 1, so the emissions
 * avoided are:
 *
 *     saved = P × D × EMISSION_FACTOR
 *
 * Attribution matters, because crediting the same kilogram twice would make
 * the platform total meaningless:
 *
 *   - A passenger is credited D × EMISSION_FACTOR: the trip they did not drive.
 *   - A driver is credited nothing under "saved". They were making the journey
 *     regardless, so their own emissions are unchanged. What they did do is
 *     enable their passengers' savings, which is reported separately as
 *     "enabled" and never added into "saved".
 *
 * Summing savedKg across all users therefore equals the platform's true
 * avoided emissions, with no double counting.
 *
 * Rides with no recorded distance are excluded rather than estimated, and
 * counted in `ridesWithoutDistance` so the gap is visible instead of silently
 * understating the total.
 */

/**
 * Kilograms of CO2e per vehicle-kilometre for an average in-use passenger car.
 *
 * India's in-use fleet sits in the 0.13-0.20 kg/km band, with roughly 0.171 for
 * petrol, 0.152 for diesel and 0.118 for CNG. 0.15 is taken as a mid-fleet
 * figure. DEFRA's average-car factor for comparison is about 0.17 kg CO2e/km.
 *
 * This is a fleet average, not a measurement of any particular journey. It is
 * overridable so the figure can be tuned per market without touching logic.
 */
export const DEFAULT_EMISSION_FACTOR_KG_PER_KM = 0.15;

export function resolveEmissionFactor(raw?: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_EMISSION_FACTOR_KG_PER_KM;
}

export interface CompletedTrip {
  /** Route length in km, or null when it was never recorded. */
  distanceKm: number | null;
  /** Seats the user occupied as a passenger; ignored for drives. */
  seats?: number;
}

export interface CompletedDrive {
  distanceKm: number | null;
  /** Seats taken by passengers on that ride. */
  passengerSeats: number;
}

export interface EmissionsSummary {
  /** Emissions the user personally avoided, by riding instead of driving. */
  savedKg: number;
  /** Emissions their passengers avoided on rides this user drove. */
  enabledKg: number;
  /** savedKg + enabledKg, for a single headline figure. */
  totalImpactKg: number;
  /** Distance actually travelled on completed trips and drives. */
  distanceKm: number;
  /** Completed journeys with no recorded distance, excluded from the above. */
  ridesWithoutDistance: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateEmissions(
  tripsAsPassenger: CompletedTrip[],
  drives: CompletedDrive[],
  emissionFactor: number = DEFAULT_EMISSION_FACTOR_KG_PER_KM,
): EmissionsSummary {
  let savedKg = 0;
  let enabledKg = 0;
  let distanceKm = 0;
  let ridesWithoutDistance = 0;

  for (const trip of tripsAsPassenger) {
    if (trip.distanceKm === null || !Number.isFinite(trip.distanceKm) || trip.distanceKm <= 0) {
      ridesWithoutDistance++;
      continue;
    }

    // One passenger occupies one car's worth of avoided travel regardless of
    // how many seats they booked, so seat count does not multiply the saving.
    savedKg += trip.distanceKm * emissionFactor;
    distanceKm += trip.distanceKm;
  }

  for (const drive of drives) {
    if (drive.distanceKm === null || !Number.isFinite(drive.distanceKm) || drive.distanceKm <= 0) {
      ridesWithoutDistance++;
      continue;
    }

    // The driver travelled the distance, but avoided nothing themselves.
    distanceKm += drive.distanceKm;
    enabledKg += Math.max(0, drive.passengerSeats) * drive.distanceKm * emissionFactor;
  }

  return {
    savedKg: round(savedKg),
    enabledKg: round(enabledKg),
    totalImpactKg: round(savedKg + enabledKg),
    distanceKm: round(distanceKm),
    ridesWithoutDistance,
  };
}
