const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mocked Data: Segments and Debt Status
const USERS = {
  "49002010965": { debt: true, modifier: 0 },
  "49002010976": { debt: false, modifier: 100 },
  "49002010987": { debt: false, modifier: 300 },
  "49002010998": { debt: false, modifier: 1000 },
};

// Business Constraints
const LIMITS = {
  MIN_AMOUNT: 2000,
  MAX_AMOUNT: 10000,
  MIN_PERIOD: 12,
  MAX_PERIOD: 60,
};

/**
 * Helper function to check if a specific loan amount and period is approved
 * Based on formula: (modifier / amount) * period >= 1
 */
const isApproved = (modifier, amount, period) => {
  const creditScore = (modifier / amount) * period;
  return creditScore >= 1;
};

/**
 * Helper function to find the maximum approved amount for a specific period
 * Using binary search for efficiency
 */
const findMaxAmountForPeriod = (modifier, period) => {
  const theoreticalMax = Math.min(modifier * period, LIMITS.MAX_AMOUNT);
  
  if (theoreticalMax < LIMITS.MIN_AMOUNT) {
    return 0;
  }
  
  // Binary search for maximum amount
  let left = LIMITS.MIN_AMOUNT;
  let right = theoreticalMax;
  let bestAmount = 0;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (isApproved(modifier, mid, period)) {
      bestAmount = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return bestAmount;
};

/**
 * Main decision engine - ALWAYS tries to find the best possible loan
 */
function calculateDecision(personalCode, requestedAmount, requestedPeriod) {
  const user = USERS[personalCode];

  // 1. Debt Check or Unknown User
  if (!user || user.debt) {
    return {
      decision: "negative",
      approvedAmount: 0,
      approvedPeriod: 0,
      message: user?.debt ? "Person has active debt." : "User not found.",
    };
  }

  const { modifier } = user;
  
  // Normalize inputs - clamp to valid ranges for calculation purposes
  // But we don't reject them because the engine should still find the best possible loan
  let effectiveAmount = requestedAmount;
  let effectivePeriod = requestedPeriod;
  
  // Clamp period to valid range for calculation
  if (effectivePeriod < LIMITS.MIN_PERIOD) {
    effectivePeriod = LIMITS.MIN_PERIOD;
  } else if (effectivePeriod > LIMITS.MAX_PERIOD) {
    effectivePeriod = LIMITS.MAX_PERIOD;
  }
  
  // Clamp amount to valid range for calculation
  if (effectiveAmount < LIMITS.MIN_AMOUNT) {
    effectiveAmount = LIMITS.MIN_AMOUNT;
  } else if (effectiveAmount > LIMITS.MAX_AMOUNT) {
    effectiveAmount = LIMITS.MAX_AMOUNT;
  }
  
  let approvedAmount = 0;
  let approvedPeriod = effectivePeriod;
  let logicPath = "";

  // 2. Check if the effective amount is approved for the effective period
  if (isApproved(modifier, effectiveAmount, effectivePeriod)) {
    logicPath = "Requested amount (after normalization) approved - finding maximum for this period";
    // Case 1: Requested amount is approved
    // Find the maximum amount for this period
    approvedAmount = findMaxAmountForPeriod(modifier, effectivePeriod);
    
    // If no amount found (shouldn't happen if requested amount is approved)
    if (approvedAmount === 0) {
      approvedAmount = effectiveAmount; // Fallback to effective amount
    }
  } else {
    logicPath = "Requested amount (after normalization) not approved - searching for best alternative";
    // Case 2: Requested amount is NOT approved
    // Try to find the best amount for the effective period first
    approvedAmount = findMaxAmountForPeriod(modifier, effectivePeriod);
    
    // If no suitable amount found for effective period, try other periods
    if (approvedAmount === 0) {
      logicPath += " → No amount for this period, trying other periods";
      for (let period = LIMITS.MIN_PERIOD; period <= LIMITS.MAX_PERIOD; period++) {
        if (period === effectivePeriod) continue;
        
        const amount = findMaxAmountForPeriod(modifier, period);
        if (amount > approvedAmount) {
          approvedAmount = amount;
          approvedPeriod = period;
        }
      }
    }
  }

  // 3. Final Verification
  if (approvedAmount < LIMITS.MIN_AMOUNT) {
    return {
      decision: "negative",
      approvedAmount: 0,
      approvedPeriod: 0,
      message: "No suitable loan amount found for any valid period.",
    };
  }

  return {
    decision: "positive",
    approvedAmount: Math.floor(approvedAmount),
    approvedPeriod: approvedPeriod,
    message: `Loan approved (${logicPath})`,
    // Optional: Include original request for transparency
    originalRequest: {
      amount: requestedAmount,
      period: requestedPeriod
    }
  };
}

/**
 * API ENDPOINT
 * POST /api/decision
 * Now accepts ANY numeric inputs and will always try to find the best possible loan
 */
app.post("/api/decision", (req, res) => {
  const { personalCode, requestedLoanAmount, requestedLoanPeriod } = req.body;

  // Input Validation - only check for existence, not ranges
  if (!personalCode || requestedLoanAmount === undefined || requestedLoanPeriod === undefined) {
    return res.status(400).json({ error: "Missing required input fields." });
  }

  const amount = Number(requestedLoanAmount);
  const period = Number(requestedLoanPeriod);

  // Validate that inputs are valid numbers
  if (isNaN(amount) || isNaN(period)) {
    return res.status(400).json({ error: "Invalid input values. Please provide numbers." });
  }

  // Don't validate ranges - let the engine handle it
  const result = calculateDecision(personalCode, amount, period);
  
  // Return appropriate status code
  if (result.decision === "negative") {
    return res.status(422).json(result);
  }
  
  return res.status(200).json(result);
});

// Basic Health Check
app.get("/", (req, res) => {
  res.send("Loan Decision Engine API is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});