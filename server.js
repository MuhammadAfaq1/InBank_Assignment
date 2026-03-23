const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const USERS = {
  "49002010965": { debt: true, modifier: 0 },
  "49002010976": { debt: false, modifier: 100 },
  "49002010987": { debt: false, modifier: 300 },
  "49002010998": { debt: false, modifier: 1000 },
};

const LIMITS = {
  MIN_AMOUNT: 2000,
  MAX_AMOUNT: 10000,
  MIN_PERIOD: 12,
  MAX_PERIOD: 60,
};

const isApproved = (modifier, amount, period) => {
  const creditScore = (modifier / amount) * period;
  return creditScore >= 1;
};

const findMaxAmountForPeriod = (modifier, period) => {
  const theoreticalMax = Math.min(modifier * period, LIMITS.MAX_AMOUNT);
  
  if (theoreticalMax < LIMITS.MIN_AMOUNT) {
    return 0;
  }
  
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

function calculateDecision(personalCode, requestedAmount, requestedPeriod) {
  const user = USERS[personalCode];

  if (!user || user.debt) {
    return {
      decision: "negative",
      approvedAmount: 0,
      approvedPeriod: 0,
      message: user?.debt ? "Person has active debt." : "User not found.",
    };
  }

  const { modifier } = user;

  let effectiveAmount = requestedAmount;
  let effectivePeriod = requestedPeriod;
  
  if (effectivePeriod < LIMITS.MIN_PERIOD) {
    effectivePeriod = LIMITS.MIN_PERIOD;
  } else if (effectivePeriod > LIMITS.MAX_PERIOD) {
    effectivePeriod = LIMITS.MAX_PERIOD;
  }
  
  if (effectiveAmount < LIMITS.MIN_AMOUNT) {
    effectiveAmount = LIMITS.MIN_AMOUNT;
  } else if (effectiveAmount > LIMITS.MAX_AMOUNT) {
    effectiveAmount = LIMITS.MAX_AMOUNT;
  }
  
  let approvedAmount = 0;
  let approvedPeriod = effectivePeriod;
  let logicPath = "";

  if (isApproved(modifier, effectiveAmount, effectivePeriod)) {
    logicPath = "Requested amount (after normalization) approved - finding maximum for this period";
   
    approvedAmount = findMaxAmountForPeriod(modifier, effectivePeriod);
    
    if (approvedAmount === 0) {
      approvedAmount = effectiveAmount; 
    }
  } else {
    logicPath = "Requested amount (after normalization) not approved - searching for best alternative";
   
    approvedAmount = findMaxAmountForPeriod(modifier, effectivePeriod);
    
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
    originalRequest: {
      amount: requestedAmount,
      period: requestedPeriod
    }
  };
}

app.post("/api/decision", (req, res) => {
  const { personalCode, requestedLoanAmount, requestedLoanPeriod } = req.body;

  if (!personalCode || requestedLoanAmount === undefined || requestedLoanPeriod === undefined) {
    return res.status(400).json({ error: "Missing required input fields." });
  }

  const amount = Number(requestedLoanAmount);
  const period = Number(requestedLoanPeriod);

  if (isNaN(amount) || isNaN(period)) {
    return res.status(400).json({ error: "Invalid input values. Please provide numbers." });
  }

  const result = calculateDecision(personalCode, amount, period);
  
  if (result.decision === "negative") {
    return res.status(422).json(result);
  }
  
  return res.status(200).json(result);
});

app.get("/", (req, res) => {
  res.send("Loan Decision Engine API is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
