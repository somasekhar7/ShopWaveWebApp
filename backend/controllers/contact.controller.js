import pool from "../lib/db.js";
import sendEmail from "../lib/nodemailer.js";

export const postUserQuery = async (req, res) => {
  try {
    const { userId, message } = req.body;
    const [user] = await pool.query("SELECT * FROM Users WHERE user_id = ?", [
      userId,
    ]);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Insert the user query into the ContactUs table
    const res_status = "pending";
    await pool.query(
      "INSERT INTO ContactUs (user_id, message,response_status) VALUES (?,?,?)",
      [userId, message, res_status]
    );
    return res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUserQuery = async (req, res) => {
  try {
    // Retrieve all queries from the ContactUs table
    const [queries] = await pool.query(
      "SELECT contact_id, user_id, message, response_status, created_at FROM ContactUs"
    );

    if (!queries || queries.length === 0) {
      return res.status(404).json({ message: "No queries found." });
    }

    return res.status(200).json(queries);
  } catch (error) {
    console.error("Error fetching queries:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while fetching queries." });
  }
};

export const respondToQuery = async (req, res) => {
  try {
    const { queryId, response } = req.body;

    // Validate inputs
    if (!queryId || !response?.trim()) {
      return res.status(400).json({ message: "Invalid request data." });
    }

    // Fetch the user details and query information
    const [[query]] = await pool.query(
      "SELECT c.contact_id, c.user_id, c.message, u.email FROM ContactUs c JOIN Users u ON c.user_id = u.user_id WHERE c.contact_id = ?",
      [queryId]
    );

    if (!query) {
      return res.status(404).json({ message: "Query not found." });
    }

    const { email, message } = query;

    // Send email to the user

    const mailOptions = await sendEmail({
      to: email,
      subject: "Response to Your Query",
      html: `
        <p>Hi,</p>
        <p>We have reviewed your query:</p>
        <blockquote>${message}</blockquote>
        <p>Our Response:</p>
        <blockquote>${response}</blockquote>
        <p>Thank you for reaching out to us.</p>
        <p>Best regards,</p>
        <p>Your Support Team</p>
      `,
    });

    // Update the response status in the database
    await pool.query(
      "UPDATE ContactUs SET response_status = 'resolved' WHERE contact_id = ?",
      [queryId]
    );

    return res
      .status(200)
      .json({ message: "Response sent successfully and query resolved." });
  } catch (error) {
    console.error("Error responding to query:", error.message);
    return res
      .status(500)
      .json({ message: "Server error while responding to the query." });
  }
};
