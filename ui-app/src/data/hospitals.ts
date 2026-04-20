// Hospital interface
export interface Hospital {
  hospitalID: number;
  name: string;
}

// Pet hospital name prefixes and suffixes for realistic names
const prefixes = [
  'Happy Paws', 'Furry Friends', 'Whiskers & Tails', 'Pawsome', 'Bark Avenue',
  'Purrfect Care', 'Wagging Tails', 'Fuzzy Buddies', 'Critter Care', 'Pet Paradise',
  'Animal Haven', 'Loving Paws', 'Best Friends', 'Companion', 'Four Paws',
  'Gentle Touch', 'Caring Hearts', 'Lucky Pet', 'Golden Paw', 'Blue Ribbon',
  'Sunshine', 'Meadow', 'Valley', 'Lakeside', 'Riverside', 'Hilltop', 'Oakwood',
  'Willow Creek', 'Cedar Grove', 'Pine Valley', 'Maple Leaf', 'Country', 'Village',
  'Downtown', 'Uptown', 'Central', 'Family', 'Premier', 'Elite'
];

const locations = [
  'Springfield', 'Riverside', 'Fairview', 'Georgetown', 'Madison', 'Franklin',
  'Clinton', 'Arlington', 'Salem', 'Bristol', 'Chester', 'Greenville', 'Newport',
  'Oakland', 'Clayton', 'Milton', 'Ashland', 'Burlington', 'Manchester', 'Dover',
  'Kingston', 'Windsor', 'Plymouth', 'Hamilton', 'Lexington', 'Winchester',
  'Centerville', 'Dayton', 'Oxford', 'Cambridge', 'Hudson', 'Jamestown'
];

const suffixes = [
  'Pet Hospital', 'Animal Hospital', 'Veterinary Clinic', 'Vet Center', 'Animal Clinic',
  'Pet Care Center', 'Veterinary Hospital', 'Animal Medical Center', 'Pet Wellness Center'
];

// Generate a random hospital ID (4-5 digits)
function generateHospitalID(): number {
  const min = 1000;  // 4 digits minimum
  const max = 99999; // 5 digits maximum
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random hospital name
function generateHospitalName(index: number): string {
  const prefix = prefixes[index % prefixes.length];
  const location = locations[Math.floor(index / prefixes.length) % locations.length];
  const suffix = suffixes[index % suffixes.length];
  return `${prefix} ${location} ${suffix}`;
}

// Generate 300 unique hospitals
function generateHospitals(count: number = 300): Hospital[] {
  const hospitals: Hospital[] = [];
  const usedIDs = new Set<number>();

  for (let i = 0; i < count; i++) {
    // Ensure unique hospital ID
    let hospitalID: number;
    do {
      hospitalID = generateHospitalID();
    } while (usedIDs.has(hospitalID));
    usedIDs.add(hospitalID);

    hospitals.push({
      hospitalID,
      name: generateHospitalName(i)
    });
  }

  return hospitals;
}

// Export the generated hospitals
export const hospitals: Hospital[] = generateHospitals(3000);

// Export the generation function for testing
export { generateHospitals };
