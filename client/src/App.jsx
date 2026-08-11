import { useState } from "react";
import "./App.css";

function App() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    const recipientList = recipients
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email !== "");

    if (!subject || !body || recipientList.length === 0) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.MODE === "development"
          ? "http://localhost:5000"
          : "https://bulk-mail-app-shy4.onrender.com");

      const response = await fetch(`${apiUrl}/api/mail/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          body,
          recipients: recipientList,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Email sent successfully!");

        setSubject("");
        setBody("");
        setRecipients("");
      } else {
        setMessage(data.message || "Failed to send email.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="mail-container">
        <h1>Bulk Mail</h1>
        <p className="subtitle">
          Send emails to multiple recipients
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="subject">Subject</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Enter email subject"
          />

          <label htmlFor="recipients">
            Recipients
          </label>
          <input
            id="recipients"
            type="text"
            value={recipients}
            onChange={(event) => setRecipients(event.target.value)}
            placeholder="email1@gmail.com, email2@gmail.com"
          />

          <small>
            Separate multiple email addresses with commas.
          </small>

          <label htmlFor="body">Email Body</label>
          <textarea
            id="body"
            rows="8"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your email..."
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send Bulk Email"}
          </button>
        </form>

        {message && (
          <p className="message">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;