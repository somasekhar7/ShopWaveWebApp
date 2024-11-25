import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "../lib/axios";

const AdminQueriesPage = () => {
  const [queries, setQueries] = useState([]);
  const [response, setResponse] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Fetch all queries
    axios
      .get("/contact-us/get-user-query")
      .then((response) => {
        // Filter queries with status "pending"
        const pendingQueries = response.data.filter(
          (query) => query.response_status === "pending"
        );
        setQueries(pendingQueries);
      })
      .catch((error) => {
        console.error("Failed to fetch queries:", error);
        setErrorMessage("Failed to load queries.");
      });
  }, []);

  const handleResponseChange = (queryId, value) => {
    setResponse((prev) => ({ ...prev, [queryId]: value }));
  };

  const handleSendResponse = (queryId) => {
    if (!response[queryId]?.trim()) {
      alert("Response cannot be empty.");
      return;
    }

    axios
      .post(`/contact-us/respond-query`, {
        queryId,
        response: response[queryId],
      })
      .then(() => {
        alert("Response sent successfully!");
        setResponse((prev) => ({ ...prev, [queryId]: "" }));
        // Remove the query from the list after responding
        setQueries((prev) => prev.filter((q) => q.contact_id !== queryId));
      })
      .catch((error) => {
        console.error("Failed to send response:", error);
        alert("An error occurred. Please try again later.");
      });
  };

  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-4xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-center text-3xl font-extrabold text-emerald-400">
          User Queries
        </h2>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errorMessage && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}
          {queries.length === 0 ? (
            <p className="text-sm text-gray-400">No pending queries found.</p>
          ) : (
            queries.map((query) => (
              <div
                key={query.contact_id}
                className="bg-gray-700 px-4 py-3 rounded-lg shadow-md mb-4"
              >
                <p className="text-sm text-gray-300 mb-2">
                  <strong>User ID:</strong> {query.user_id}
                </p>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>Message:</strong> {query.message}
                </p>
                <p className="text-sm text-gray-300 mb-2">
                  <strong>Status:</strong>{" "}
                  <span className="font-bold text-yellow-400">
                    {query.response_status}
                  </span>
                </p>
                <textarea
                  value={response[query.contact_id] || ""}
                  onChange={(e) =>
                    handleResponseChange(query.contact_id, e.target.value)
                  }
                  placeholder="Write your response here..."
                  className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm mb-2"
                />
                <button
                  onClick={() => handleSendResponse(query.contact_id)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out"
                >
                  Send Response
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminQueriesPage;
