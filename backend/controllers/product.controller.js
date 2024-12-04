import pool from "../lib/db.js"; // Import your MySQL connection
import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (_req, res) => {
  try {
    // MySQL query to fetch all products, including categories and images
    const [products] = await pool.query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.product_description,
        p.price,
        p.stock_quantity,
        p.created_at,
        p.updated_at,
        p.isFeatured,
        c.category_name,
        GROUP_CONCAT(pi.image_url) AS images
      FROM 
        Products p
      LEFT JOIN 
        Categories c ON p.category_id = c.category_id
      LEFT JOIN 
        ProductImages pi ON p.product_id = pi.product_id
      GROUP BY 
        p.product_id
    `);

    // Return the products along with images and category names as a JSON response
    res.json(products);
  } catch (error) {
    console.error("Error in getAllProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    // Check if the featured products are cached in Redis
    let featuredProducts = await redis.get("featured_products");

    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }

    // If not cached, fetch from the MySQL database with a join to productImages
    const [products] = await pool.query(`
      SELECT
        p.product_id,
        p.product_name,
        p.product_description,
        p.price,
        p.stock_quantity,
        p.created_at,
        p.updated_at,
        pi.image_url
      FROM
        Products p
      LEFT JOIN
        ProductImages pi ON p.product_id = pi.product_id
      WHERE
        p.isFeatured = true
    `);

    if (products.length === 0) {
      return res.status(404).json({ message: "No featured products found" });
    }

    // Cache the result in Redis for future requests
    // store in redis for future quick access
    await redis.set("featured_products", JSON.stringify(products));

    // Return the featured products
    res.json(products);
  } catch (error) {
    console.error("Error in getFeaturedProducts controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const createProduct = async (req, res) => {
  try {
    const {
      product_name,
      product_description,
      price,
      image,
      stock_quantity,
      category_id,
    } = req.body;

    let cloudinaryResponse = null;

    // Upload image to Cloudinary if an image is provided
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    // Check if the category exists
    const [categoryResult] = await pool.query(
      "SELECT category_id FROM Categories WHERE category_id = ?",
      [category_id]
    );

    if (categoryResult.length === 0) {
      return res.status(400).json({ message: "Category not found." });
    }

    //const categoryId = categoryResult[0].category_id;

    // Insert the product into the Products table
    const [productResult] = await pool.query(
      "INSERT INTO Products (product_name, product_description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?)",
      [product_name, product_description, price, stock_quantity, category_id] // Assuming stock_quantity is initialized to 0 or a default value
    );

    const productId = productResult.insertId;

    // Insert the image URL into the ProductImages table if an image was uploaded
    if (cloudinaryResponse) {
      await pool.query(
        "INSERT INTO ProductImages (product_id, image_url) VALUES (?, ?)",
        [productId, cloudinaryResponse.secure_url]
      );
    }

    // Fetch the created product with its details
    const [newProduct] = await pool.query(
      "SELECT * FROM Products WHERE product_id = ?",
      [productId]
    );

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error("Error in createProduct controller:", error.message);
    res
      .status(500)
      .json({ message: "An error occurred while creating the product." });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    console.log(req);
    const product_id = req.params.id;

    // Log the product ID for debugging
    console.log("Attempting to delete product with ID:", product_id);

    // Query to check if the product exists
    const [productResult] = await pool.query(
      "SELECT * FROM Products WHERE product_id = ?",
      [product_id]
    );

    if (productResult.length === 0) {
      console.log("Product not found.");
      return res.status(404).json({ message: "Product not found." });
    }

    // Query to find images associated with the product
    const [imageResults] = await pool.query(
      "SELECT * FROM ProductImages WHERE product_id = ?",
      [product_id]
    );

    // Delete images from Cloudinary
    for (const image of imageResults) {
      const publicId = image.image_url.split("/").pop().split(".")[0]; // Adjust if your URL format is different
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log(`Deleted image from Cloudinary: ${publicId}`);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error.message);
      }
    }

    // Delete the product from the Products table (this will cascade delete images)
    await pool.query("DELETE FROM Products WHERE product_id = ?", [product_id]);
    // Update Redis cache for featured products
    await updateFeaturedProductsCache();

    console.log("Product deleted successfully");
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProduct controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    // Query to get 3 random products along with their image
    const [products] = await pool.query(`
      SELECT 
        p.product_id,
        p.product_name ,
        p.product_description,
        p.price,
        pi.image_url
      FROM Products p
      LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
      ORDER BY RAND()
      LIMIT 4
    `);

    res.json(products);
  } catch (error) {
    console.error("Error in getRecommendedProducts controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    // Query to get products and their associated images based on category name
    const query = `
      SELECT 
        p.product_id, 
        p.product_name, 
        p.product_description, 
        p.price, 
        p.stock_quantity, 
        p.created_at, 
        p.updated_at,
        pi.image_url, 
        pi.image_alt_text
      FROM Products p
      JOIN Categories c ON p.category_id = c.category_id
      LEFT JOIN ProductImages pi ON p.product_id = pi.product_id
      WHERE c.category_name = ?;
    `;

    // Execute the query with the category as a parameter
    const [products] = await pool.query(query, [category]);

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found in this category." });
    }

    res.json(products);
  } catch (error) {
    console.error("Error in getProductsByCategory controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    // Fetch the product by its ID from the MySQL database
    const [product] = await pool.query(
      "SELECT * FROM Products WHERE product_id = ?",
      [req.params.id]
    );

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Toggle the 'isFeatured' field
    const newIsFeaturedValue = !product[0].isFeatured;

    // Update the product in the database
    const [updateResult] = await pool.query(
      "UPDATE Products SET isFeatured = ? WHERE product_id = ?",
      [newIsFeaturedValue, req.params.id]
    );

    if (updateResult.affectedRows > 0) {
      // Update Redis cache for featured products
      await updateFeaturedProductsCache();

      // Respond with the updated product information
      res.json({
        product_id: product[0].product_id,
        product_name: product[0].product_name,
        isFeatured: newIsFeaturedValue,
        message: "Product updated successfully",
      });
    } else {
      res.status(500).json({ message: "Failed to update the product" });
    }
  } catch (error) {
    console.error("Error in toggleFeaturedProduct controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Function to update the Redis cache with featured products
async function updateFeaturedProductsCache() {
  try {
    // // Fetch all featured products from the MySQL database
    // const [featuredProducts] = await pool.query(
    //   "SELECT * FROM Products WHERE isFeatured = true"
    // );
    // Fetch all featured products from the MySQL database with their image URLs
    const [featuredProducts] = await pool.query(`
      SELECT
        p.product_id,
        p.product_name,
        p.product_description,
        p.price,
        p.stock_quantity,
        p.created_at,
        p.updated_at,
        pi.image_url
      FROM
        Products p
      LEFT JOIN
        ProductImages pi ON p.product_id = pi.product_id
      WHERE
        p.isFeatured = true
    `);

    // Store the featured products in Redis
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.error("Error in updateFeaturedProductsCache:", error.message);
  }
}
