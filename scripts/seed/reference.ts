/**
 * Domain reference data.
 *
 * This is deliberately not generated. Random city pairs produce incoherent
 * routes ("Byasanagar to Nagercoil, 40 minutes, Rs 90"), and faker's vehicle
 * data is US-market. Curated corridors keep distance, duration and price
 * consistent with each other so the demo reads as a real marketplace.
 *
 * These are vocabulary, not fixtures: no user, ride or booking is written
 * here. Every record is generated from them.
 */

export interface Corridor {
  origin: string;
  destination: string;
  distanceKm: number;
  duration: string;
  /** Typical per-seat fare in INR; generators vary around this. */
  basePrice: number;
}

export const CORRIDORS: readonly Corridor[] = [
  { origin: "Mumbai", destination: "Pune", distanceKm: 150, duration: "3h 15m", basePrice: 450 },
  { origin: "Delhi", destination: "Jaipur", distanceKm: 280, duration: "5h 30m", basePrice: 700 },
  { origin: "Bengaluru", destination: "Mysuru", distanceKm: 145, duration: "3h 00m", basePrice: 400 },
  { origin: "Ahmedabad", destination: "Vadodara", distanceKm: 110, duration: "2h 00m", basePrice: 320 },
  { origin: "Chennai", destination: "Pondicherry", distanceKm: 160, duration: "3h 30m", basePrice: 480 },
  { origin: "Hyderabad", destination: "Warangal", distanceKm: 145, duration: "2h 45m", basePrice: 390 },
  { origin: "Kolkata", destination: "Durgapur", distanceKm: 170, duration: "3h 20m", basePrice: 460 },
  { origin: "Delhi", destination: "Chandigarh", distanceKm: 245, duration: "4h 30m", basePrice: 620 },
  { origin: "Pune", destination: "Nashik", distanceKm: 210, duration: "4h 00m", basePrice: 560 },
  { origin: "Surat", destination: "Ahmedabad", distanceKm: 265, duration: "4h 15m", basePrice: 640 },
  { origin: "Bengaluru", destination: "Coimbatore", distanceKm: 360, duration: "6h 30m", basePrice: 850 },
  { origin: "Jaipur", destination: "Udaipur", distanceKm: 395, duration: "6h 45m", basePrice: 900 },
];

/** Passenger-carrying models common on Indian roads. */
export const CAR_MODELS: readonly string[] = [
  "Maruti Suzuki Swift", "Maruti Suzuki Dzire", "Maruti Suzuki Ertiga",
  "Hyundai Creta", "Hyundai i20", "Hyundai Venue",
  "Tata Nexon", "Tata Punch", "Tata Altroz",
  "Mahindra XUV700", "Mahindra Scorpio", "Mahindra Bolero",
  "Toyota Innova Crysta", "Kia Seltos", "Kia Carens",
  "Honda City", "Renault Triber", "MG Hector",
];

export const CAR_COLOURS: readonly string[] = [
  "White", "Silver", "Grey", "Black", "Red", "Blue", "Pearl White", "Bronze",
];

export const RIDE_PREFERENCES: readonly string[] = [
  "No smoking",
  "Music welcome",
  "Quiet ride preferred",
  "Pets allowed",
  "AC on throughout",
  "Luggage space available",
  "Women-only ride",
  "Frequent stops on request",
];

/** Landmarks used for pickup and drop-off points within a city. */
export const PICKUP_LANDMARKS: readonly string[] = [
  "Railway Station", "Bus Depot", "Airport Terminal 1", "City Mall",
  "Metro Station", "Ring Road Junction", "Tech Park Gate 2", "Civil Hospital",
];

export const SAFETY_ZONE_KINDS: readonly string[] = [
  "Police Station", "Hospital", "24x7 Fuel Station", "Highway Rest Stop",
  "Toll Plaza", "Municipal Office",
];

export const CONTACT_RELATIONSHIPS: readonly string[] = [
  "Spouse", "Parent", "Sibling", "Friend", "Colleague", "Guardian",
];

export const REWARD_KINDS: readonly { type: string; points: number; description: string }[] = [
  { type: "safety_verification", points: 25, description: "Completed identity verification" },
  { type: "milestone", points: 50, description: "Reached 10 completed rides" },
  { type: "eco", points: 15, description: "Chose a shared ride over driving alone" },
  { type: "referral", points: 40, description: "Referred a friend who completed a ride" },
];

export const POSITIVE_REVIEWS: readonly string[] = [
  "Punctual and easy to coordinate with. Smooth ride.",
  "Comfortable car and a safe driver. Would travel again.",
  "Left exactly on time and kept me updated throughout.",
  "Pleasant company and careful on the highway.",
  "Clean vehicle, good music, no complaints at all.",
  "Very accommodating about the pickup point.",
];

export const MIXED_REVIEWS: readonly string[] = [
  "Ride was fine, started about twenty minutes late.",
  "Good driver, though the car was a little cramped with luggage.",
  "Reached safely. Communication could have been better.",
];

/** Opening lines for a booking conversation, from the passenger. */
export const PASSENGER_OPENERS: readonly string[] = [
  "Hi, I have booked a seat. Where exactly should I wait?",
  "Hello, is it possible to be picked up near the metro station?",
  "Hi, just confirming the departure time for tomorrow.",
  "Hello, I have one medium suitcase. Is that alright?",
];

export const DRIVER_REPLIES: readonly string[] = [
  "Hi, I will be at the main gate. I will message when I am nearby.",
  "Sure, that works. Please be ready ten minutes early.",
  "Yes, leaving on time. See you there.",
  "No problem, there is space in the boot.",
];

export const FOLLOW_UPS: readonly string[] = [
  "Perfect, thank you.",
  "Great, see you then.",
  "Noted, I will be on time.",
  "Thanks for confirming.",
];
