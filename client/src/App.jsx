import { useState } from "react";
import axios from "axios";

function App() {
  const [form, setForm] = useState({
    personalCode: "",
    requestedLoanAmount: "",
    requestedLoanPeriod: ""
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    try {
      setError(null);

      const res = await axios.post(
        "http://localhost:5000/api/decision",
        {
          personalCode: Number(form.personalCode),
          requestedLoanAmount: Number(form.requestedLoanAmount),
          requestedLoanPeriod: Number(form.requestedLoanPeriod)
        }
      );

      setResult(res.data);
    } catch (err) {
      if (err.response) {
        setResult(err.response.data);
      } else {
        setError("Server error. Please try again.");
      }
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Loan Decision Engine</h2>

      <input
        type="number"
        placeholder="Personal Code"
        value={form.personalCode}
        onChange={e =>
          setForm({ ...form, personalCode: e.target.value })
        }
      />

      <br /><br />

      <input
        type="number"
        placeholder="Loan Amount"
        value={form.requestedLoanAmount}
        onChange={e =>
          setForm({ ...form, requestedLoanAmount: e.target.value })
        }
      />

      <br /><br />

      <input
        type="number"
        placeholder="Loan Period (months)"
        value={form.requestedLoanPeriod}
        onChange={e =>
          setForm({ ...form, requestedLoanPeriod: e.target.value })
        }
      />

      <br /><br />

      <button onClick={handleSubmit}>Submit</button>

      <br /><br />

      {error && <p style={{ color: "red" }}>{error}</p>}

      {result && (
        <div>
          <p><strong>Decision:</strong> {result.decision}</p>
          <p><strong>Approved Amount:</strong> {result.approvedAmount} €</p>
          <p><strong>Approved Period:</strong> {result.approvedPeriod} months</p>
        </div>
      )}
    </div>
  );
}

export default App;