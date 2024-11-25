import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit, Save, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { useUserStore } from "../stores/useUserStore";
import axios from "../lib/axios";

const ProfilePage = () => {
  const { user } = useUserStore();
  const [username, setUsername] = useState(user?.user_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [contactNumber, setContactNumber] = useState(user?.phone_number || "");
  const [orderSummary, setOrderSummary] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Fetch user profile and order summary
    axios
      .post("/auth/user-profile", {
        userId: user.user_id,
      })
      .then((response) => {
        const { user, orders } = response.data;
        setUsername(user.user_name);
        setEmail(user.email);
        setContactNumber(user.phone_number);
        setOrderSummary(orders);
      })
      .catch((error) => {
        console.error("Failed to fetch user profile:", error);
      });
  }, [user?.user_id]);

  const handleEditToggle = () => setIsEditing(!isEditing);

  const handleSave = () => {
    const updatedProfile = {
      userId: user?.user_id, // Sending the user ID with the update request
      user_name: username,
      email,
      phone_number: contactNumber,
    };

    // Call backend to update profile
    axios
      .put("auth/update-user-profile", updatedProfile)
      .then(() => {
        setIsEditing(false);
        alert("Profile updated successfully!");
      })
      .catch((error) => {
        console.error("Failed to update profile:", error);
        alert("Failed to update profile.");
      });
  };

  const downloadOrderSummaryPDF = () => {
    if (orderSummary.length === 0) {
      alert("No orders to download.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height - 10; // Page height with padding

    // Define styles
    const headerColor = [33, 150, 243]; // A blue color for headers
    const grayColor = [230, 230, 230]; // Light gray for item background
    const titleFontSize = 16;
    const headerFontSize = 12;
    const textFontSize = 10;

    doc.setFontSize(titleFontSize);
    doc.setTextColor(...headerColor);
    doc.text("Order Summary", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(headerFontSize);

    let yPosition = 20; // Starting position for the first order

    orderSummary.forEach((order, index) => {
      // Check if adding this order would exceed page height, add new page if necessary
      if (yPosition + 30 > pageHeight) {
        doc.addPage();
        yPosition = 10;
        doc.setFontSize(headerFontSize);
        doc.setTextColor(...headerColor);
        doc.text("Order Summary (continued)", pageWidth / 2, yPosition, {
          align: "center",
        });
        yPosition += 10;
      }

      // Section header for each order
      doc.setDrawColor(...headerColor);
      doc.setLineWidth(0.5);
      doc.line(10, yPosition - 5, pageWidth - 10, yPosition - 5); // underline
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(headerFontSize);
      doc.text(`Order ${index + 1}`, 10, yPosition);

      // Wrap the order ID to fit within the page width
      const orderIdText = doc.splitTextToSize(
        `Order ID: ${order.orderId}`,
        pageWidth - 100
      );
      doc.text(orderIdText, pageWidth - 110, yPosition);
      yPosition += orderIdText.length * 5; // Adjust yPosition based on wrapped text height

      // Order details
      doc.setFontSize(textFontSize);
      doc.text(`Total Amount: $${order.totalAmount}`, 10, yPosition);
      doc.text(`Status: ${order.orderStatus}`, pageWidth - 60, yPosition);
      yPosition += 10;

      // Table headers for items
      doc.setFillColor(...grayColor);
      doc.rect(10, yPosition, pageWidth - 20, 8, "F"); // Light gray background
      doc.setFontSize(textFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text("Item", 12, yPosition + 5);
      doc.text("Quantity", pageWidth / 2 - 20, yPosition + 5);
      doc.text("Price", pageWidth - 40, yPosition + 5);
      yPosition += 10;

      // Table rows for each item in the order
      order.items.forEach((item, itemIndex) => {
        // Check for page overflow before printing each item
        if (yPosition + 10 > pageHeight) {
          doc.addPage();
          yPosition = 10;
        }

        // Alternate row background color
        if (itemIndex % 2 === 0) {
          doc.setFillColor(...grayColor);
          doc.rect(10, yPosition, pageWidth - 20, 8, "F"); // Light gray for alternating rows
        }

        // Item details
        doc.text(item.productName, 12, yPosition + 5);
        doc.text(`${item.quantity}`, pageWidth / 2 - 20, yPosition + 5);
        doc.text(`$${item.price}`, pageWidth - 40, yPosition + 5);
        yPosition += 10;
      });

      // Add spacing between orders
      yPosition += 10;
    });

    // Save the PDF
    doc.save("Order_Summary.pdf");
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
          Your Profile
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
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditing}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                disabled={!isEditing}
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-300">
                Order Summary
              </h3>
              {orderSummary.length === 0 ? (
                <p className="text-sm text-gray-400">
                  You havent ordered anything.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {orderSummary.map((order, index) => (
                    <div
                      key={index}
                      className="bg-gray-700 px-4 py-3 rounded-lg shadow-md flex justify-between items-center"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-emerald-400">
                          Order {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-200">
                          Amount:
                        </span>
                        <span className="text-sm text-white">
                          ${order.totalAmount}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-200">
                          Status:
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            order.orderStatus === "Completed"
                              ? "text-green-400"
                              : order.orderStatus === "Pending"
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={isEditing ? handleSave : handleEditToggle}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out"
            >
              {isEditing ? (
                <>
                  <Save className="mr-2 h-5 w-5" aria-hidden="true" /> Save
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-5 w-5" aria-hidden="true" /> Edit
                </>
              )}
            </button>

            <button
              onClick={downloadOrderSummaryPDF}
              className="w-full flex justify-center py-2 px-4 mt-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out"
            >
              <Download className="mr-2 h-5 w-5" aria-hidden="true" /> Download
              Order Summary PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
