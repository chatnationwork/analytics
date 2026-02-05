
function checkScheduleAvailability(
  schedule: {
    timezone: string;
    days: Record<string, Array<{ start: string; end: string }>>;
  },
  now: Date
) {
  const { timezone, days } = schedule;

  // Helper to get day/time in target zone
  const getParts = (d: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(d);
    
    // Log parts for debugging
    // console.log("Parts:", parts.map(p => `${p.type}=${p.value}`).join(", "));

    const day =
      parts.find((p) => p.type === "weekday")?.value.toLowerCase() || "";
    const hStr = parts.find((p) => p.type === "hour")?.value || "0";
    // Handle "24" if it occurs, though usually 0-23
    let h = parseInt(hStr);
    if (h === 24) h = 0;
    
    const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
    return { day, h, m, mins: h * 60 + m };
  };

  const current = getParts(now);
  console.log(`Now (UTC): ${now.toISOString()}`);
  console.log(`Target Zone: ${timezone}`);
  console.log(`Current (Local): Day=${current.day}, H=${current.h}, M=${current.m}, Mins=${current.mins}`);

  // Check today's shifts
  const dayShifts = days[current.day] || [];
  console.log(`Shifts for ${current.day}:`, dayShifts);
  
  for (const shift of dayShifts) {
    const [startH, startM] = shift.start.split(":").map(Number);
    const [endH, endM] = shift.end.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    console.log(`Checking shift ${shift.start}-${shift.end} (${startMins}-${endMins}) vs ${current.mins}`);

    if (current.mins >= startMins && current.mins < endMins) {
      console.log("MATCH: Open");
      return { isOpen: true };
    }
  }
  
  console.log("NO MATCH: Closed");
  return { isOpen: false };
}

// Test Case 1: Standard Shift, Past Time
// Shift: 09:00 - 17:00. Current: 17:05.
console.log("--- Test 1: Standard Shift, Past Time ---");
const schedule1 = {
  timezone: "Africa/Nairobi", // UTC+3
  days: {
    thursday: [{ start: "09:00", end: "17:00" }],
  }
};
// 17:05 Nairobi = 14:05 UTC. 
// Let's assume today is Thursday.
// 2026-02-05 is Thursday.
const now1 = new Date("2026-02-05T14:05:00Z"); 
checkScheduleAvailability(schedule1, now1);


// Test Case 2: Standard Shift, In Time
console.log("\n--- Test 2: Standard Shift, In Time ---");
const now2 = new Date("2026-02-05T13:55:00Z"); // 16:55 Nairobi
checkScheduleAvailability(schedule1, now2);

// Test Case 3: Late Shift ending midnight
console.log("\n--- Test 3: Shift ending midnight ---");
const schedule2 = {
    timezone: "Africa/Nairobi",
    days: {
        thursday: [{ start: "16:00", end: "23:59" }]
    }
};
const now3 = new Date("2026-02-05T20:58:00Z"); // 23:58 Nairobi
checkScheduleAvailability(schedule2, now3);

const now4 = new Date("2026-02-05T21:01:00Z"); // 00:01 Nairobi (Friday)
checkScheduleAvailability(schedule2, now4);
