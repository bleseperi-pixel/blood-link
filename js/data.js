/* ===== BloodLink - Seed data & storage helpers =====
 * Data is stored in the browser (localStorage). For production, replace
 * these helpers with calls to a real backend/database (see README).
 */
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Compatibility: which donor blood groups can give to a recipient group.
const CAN_DONATE_TO = {
  "O-":  ["O-"],
  "O+":  ["O+", "O-"],
  "A-":  ["A-", "O-"],
  "A+":  ["A+", "A-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": BLOOD_GROUPS
};

const STORAGE_KEYS = {
  donors: "bloodlink_donors",
  requests: "bloodlink_requests",
  inventory: "bloodlink_inventory"
};

const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage unavailable", e);
    }
  }
};

// Starting inventory (units) per blood group, with expiry-soon units
const DEFAULT_INVENTORY = {
  "A+":  { units: 42, expiringSoon: 3, capacity: 80 },
  "A-":  { units: 9,  expiringSoon: 0, capacity: 30 },
  "B+":  { units: 37, expiringSoon: 6, capacity: 80 },
  "B-":  { units: 4,  expiringSoon: 0, capacity: 30 },
  "AB+": { units: 15, expiringSoon: 1, capacity: 30 },
  "AB-": { units: 2,  expiringSoon: 0, capacity: 20 },
  "O+":  { units: 58, expiringSoon: 8, capacity: 90 },
  "O-":  { units: 12, expiringSoon: 2, capacity: 40 }
};
