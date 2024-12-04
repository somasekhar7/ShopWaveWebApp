import pool from "../lib/db.js";



export const getDailySalesData = async (req, res) => {
  try {
    const today = new Date(); // Current local date
    const endDate = new Date(today.toISOString().split("T")[0]); // Normalize to local YYYY-MM-DD
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const formattedStartDate = startDate.toISOString().split("T")[0];
    const formattedEndDate = endDate.toISOString().split("T")[0];

    const [dailySalesData] = await pool.query(
      `SELECT DATE(date) as date, SUM(total_items_sold) as sales, SUM(total_revenue) as revenue
       FROM Analytics
       WHERE date BETWEEN ? AND ?
       GROUP BY DATE(date)
       ORDER BY DATE(date) ASC`,
      [formattedStartDate, formattedEndDate]
    );

    const dateArray = getDatesInRange(formattedStartDate, formattedEndDate);

    const result = dateArray.map((date) => {
      const foundData = dailySalesData.find(
        (item) => item.date.toISOString().split("T")[0] === date
      );
      return {
        date,
        sales: foundData ? foundData.sales : 0,
        revenue: foundData ? foundData.revenue : 0,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getDailySalesData:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

function getDatesInRange(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    dates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export const getAnalyticsData = async (req, res) => {
  try {
    // Call the stored procedure to update Analytics
    await pool.query("CALL UpdateAnalytics()");

    // Query to get total users
    const [users] = await pool.query(
      "SELECT COUNT(*) as totalUsers FROM Users"
    );

    // Query to get total products
    const [products] = await pool.query(
      "SELECT COUNT(*) as totalProducts FROM Products"
    );

    // Query to get total sales and total revenue from Analytics
    const [salesData] = await pool.query(
      "SELECT SUM(total_items_sold) as totalSales, SUM(total_revenue) as totalRevenue FROM Analytics"
    );

    const totalUsers = users[0].totalUsers || 0;
    const totalProducts = products[0].totalProducts || 0;
    const totalSales = salesData[0].totalSales || 0;
    const totalRevenue = salesData[0].totalRevenue || 0;

    // Return the analytics data
    res.status(200).json({
      users: totalUsers,
      products: totalProducts,
      totalSales: Number(totalSales),
      totalRevenue: parseFloat(totalRevenue),
    });
  } catch (error) {
    console.error("Error in getAnalyticsData:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
