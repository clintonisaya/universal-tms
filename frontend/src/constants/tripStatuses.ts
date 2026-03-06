/**
 * Trip status transition map — mirrors backend VALID_TRANSITIONS in trips.py.
 *
 * Rules:
 *  - Each entry lists valid NEXT statuses (forward AND one step backward).
 *  - Self-transitions are NOT listed (they're implicit for date updates).
 *  - In Transit ↔ At Border (and return variants) are interchangeable.
 *  - Breakdown is reachable from any non-terminal status.
 *  - Cancelled is reachable from any non-terminal status.
 *  - Terminal statuses (Completed, Cancelled) have empty arrays.
 */
export const VALID_NEXT_STATUSES: Record<string, string[]> = {
  // --- Go Leg ---
  "Waiting": [
    "Dispatched",                          // forward
    "Breakdown", "Cancelled",
  ],
  "Dispatched": [
    "Arrived at Loading Point",            // forward
    "Waiting",                             // backward
    "Breakdown", "Cancelled",
  ],
  "Arrived at Loading Point": [
    "Loading",                             // forward
    "Dispatched",                          // backward
    "Breakdown", "Cancelled",
  ],
  "Loading": [
    "In Transit",                          // forward (Loaded is auto — skip in dropdown)
    "Arrived at Loading Point",            // backward
    "Breakdown", "Cancelled",
  ],
  "Loaded": [                              // AUTO status — backward nav only
    "In Transit",                          // forward
    "Loading",                             // backward
    "Breakdown", "Cancelled",
  ],
  "In Transit": [
    "At Border",                           // forward (interchangeable)
    "Arrived at Destination",              // forward direct (no border)
    "Loaded",                              // backward
    "Breakdown", "Cancelled",
  ],
  "At Border": [
    "In Transit",                          // interchangeable / backward
    "Arrived at Destination",              // forward
    "Breakdown", "Cancelled",
  ],
  "Arrived at Destination": [
    "Offloading",                          // forward
    "At Border",                           // backward
    "In Transit",                          // backward alt (if no border)
    "Breakdown", "Cancelled",
  ],
  "Offloading": [
    "Returning Empty",                     // forward (Offloaded is auto — skip)
    "Arrived at Destination",              // backward
    "Breakdown", "Cancelled",
  ],
  "Offloaded": [                           // AUTO status — backward nav only
    "Returning Empty",                     // forward
    "Offloading",                          // backward
    "Breakdown", "Cancelled",
  ],
  "Returning Empty": [
    "Arrived at Yard",                     // forward
    "Offloaded",                           // backward
    "Breakdown", "Cancelled",
  ],
  "Arrived at Yard": [                     // Bridge status
    "Waiting for PODs",                    // forward (no return leg)
    "Waiting (Return)",                    // forward (return leg — filtered by hasReturnWaybill)
    "Returning Empty",                     // backward (go leg context)
    "Offloaded (Return)",                  // backward (return leg context)
    "Breakdown", "Cancelled",
  ],
  "Waiting for PODs": [
    "Completed",                           // forward (also auto on pods_confirmed_date)
    "Arrived at Yard",                     // backward
    "Breakdown", "Cancelled",
  ],
  "Completed": [],                         // Terminal
  "Cancelled": [],                         // Terminal

  // --- Breakdown — recoverable to any non-terminal ---
  "Breakdown": [
    "Waiting", "Dispatched", "Arrived at Loading Point",
    "Loading", "Loaded", "In Transit", "At Border", "Arrived at Destination",
    "Offloading", "Offloaded", "Returning Empty", "Arrived at Yard", "Waiting for PODs",
    "Waiting (Return)", "Dispatched (Return)", "Arrived at Loading Point (Return)",
    "Loading (Return)", "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
    "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
  ],

  // --- Return Leg ---
  "Waiting (Return)": [
    "Dispatched (Return)",                 // forward
    "Arrived at Yard",                     // backward (bridge)
    "Breakdown", "Cancelled",
  ],
  "Dispatched (Return)": [
    "Arrived at Loading Point (Return)",   // forward
    "Waiting (Return)",                    // backward
    "Breakdown", "Cancelled",
  ],
  "Arrived at Loading Point (Return)": [
    "Loading (Return)",                    // forward
    "Dispatched (Return)",                 // backward
    "Breakdown", "Cancelled",
  ],
  "Loading (Return)": [
    "In Transit (Return)",                 // forward (Loaded (Return) is auto)
    "Arrived at Loading Point (Return)",   // backward
    "Breakdown", "Cancelled",
  ],
  "Loaded (Return)": [                     // AUTO status — backward nav only
    "In Transit (Return)",                 // forward
    "Loading (Return)",                    // backward
    "Breakdown", "Cancelled",
  ],
  "In Transit (Return)": [
    "At Border (Return)",                  // forward (interchangeable)
    "Arrived at Destination (Return)",     // forward direct
    "Loaded (Return)",                     // backward
    "Breakdown", "Cancelled",
  ],
  "At Border (Return)": [
    "In Transit (Return)",                 // interchangeable / backward
    "Arrived at Destination (Return)",     // forward
    "Breakdown", "Cancelled",
  ],
  "Arrived at Destination (Return)": [
    "Offloading (Return)",                 // forward
    "At Border (Return)",                  // backward
    "In Transit (Return)",                 // backward alt
    "Breakdown", "Cancelled",
  ],
  "Offloading (Return)": [
    "Arrived at Yard",                     // forward (Offloaded (Return) is auto)
    "Arrived at Destination (Return)",     // backward
    "Breakdown", "Cancelled",
  ],
  "Offloaded (Return)": [                  // AUTO status — backward nav only
    "Arrived at Yard",                     // forward
    "Offloading (Return)",                 // backward
    "Breakdown", "Cancelled",
  ],
};

// All return-leg status values — used to filter options when no return waybill is attached
export const ALL_RETURN_STATUSES: string[] = [
  "Waiting (Return)", "Dispatched (Return)", "Arrived at Loading Point (Return)",
  "Loading (Return)", "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
  "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
];
