import { useState } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "../stores/useUserStore";
import axios from "../lib/axios";

const ContactUsPage = () => {
  const { user } = useUserStore();
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = () => {
    if (!message.trim()) {
      setErrorMessage("Message cannot be empty.");
      return;
    }

    axios
      .post("/contact-us/post-user-query", { userId: user.user_id, message })
      .then(() => {
        setSuccessMessage("Your query has been submitted successfully!");
        setMessage(""); // Clear the message box
        setErrorMessage("");
      })
      .catch((error) => {
        console.error("Failed to submit query:", error);
        setErrorMessage("An error occurred. Please try again later.");
      });
  };

  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-center text-3xl font-extrabold text-emerald-400">
          Contact Us
        </h2>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Describe your issue or feedback here..."
              />
            </div>

            {successMessage && (
              <p className="text-sm text-green-400">{successMessage}</p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}

            <button
              onClick={handleSubmit}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out"
            >
              Submit
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactUsPage;
