
Installation & Setup:

Clone the repository:
```bash
git clone https://github.com/MuhammadAfaq1/InBank_Assignment.git
cd InBank_assignment
```

Install dependencies:
```bash
npm install
```
If starting from scratch:
```bash
npm init -y

npm install express cors
```
Run Backend:
```bash
node server.js
```

Server runs on:
```bash
http://localhost:5000
```

Frontend Setup:
Go to Client Folder:
```bash
cd client
```
If not created yet:
```bash
npm create vite@latest client

cd client

npm install
```

Run Frontend
```bash
npm run dev
```
Frontend runs on:
```bash
http://localhost:5174
```
API Documentation

Endpoint
```bash
POST /api/decision
```
Full URL
```bash
http://localhost:5000/api/decision
```
Thought process:

1. Algorithmic Efficiency (Binary Search)
While the current credit scoring formula—(modifier / amount) * period >= 1, is linear, I implemented a Binary Search algorithm to find the maximum approved amount.

2. Input Normalization (Clamping)
The instructions state the engine should return the maximum sum regardless of the requested amount. Instead of rejecting inputs outside the 2000–10000€ range with a 400 Bad Request, my engine "clamps" these values to the nearest valid limit. This ensures that a user asking for 1,500€ (below the limit) still receives a positive offer of 2,000€ if their credit score allows it.

3. RESTful API Design
I chose to use Semantic HTTP Status Codes to distinguish between different types of outcomes:
200 OK: For all positive loan decisions.
422 Unprocessable Entity: Used for business-logic rejections like debt or low score. I preferred this over a 400 Bad Request because the request was syntactically correct, but the business rules prevented fulfillment.

4. Code Structure
The solution follows the Separation of Concerns principle. The decision engine logic is decoupled from the Express routing, allowing for easier unit testing and maintainability.

question to answer:

Q: What is one thing you would improve about the take-home assignment and how would you improve it?

I would improve the 'Decision Heuristic' regarding alternative loan offers.

Currently, if a user's requested period is not viable, the engine finds the first period that provides the maximum possible loan. However, the 'maximum' sum is not always the best financial decision for the customer, they might prefer the shortest possible period to minimize interest, even if the loan amount is smaller.

I would modify the engine to return a 'Loan Menu'. Instead of one result, the API would return three distinct options:

Closest Match: The closest possible amount to the user's original request.

Maximum Debt: The absolute highest sum they qualify for (usually at a 60 month period).

Shortest Term: The fastest way to repay the minimum 2000€ loan.
