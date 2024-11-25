import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";

// Update the categories to include IDs
const categories = [
  { id: 1, name: "jeans" },
  { id: 2, name: "t-shirts" },
  { id: 3, name: "shoes" },
  { id: 4, name: "glasses" },
  { id: 5, name: "jackets" },
  { id: 6, name: "suits" },
  { id: 7, name: "bags" },
  { id: 8, name: "hats" },
  { id: 9, name: "watches" },
];

const CreateProductForm = () => {
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    product_description: "",
    price: "",
    category_id: "", // Change to store category ID
    stock_quantity: "",
    image: "",
  });

  const { createProduct, loading } = useProductStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        product_name: newProduct.product_name,
        product_description: newProduct.product_description,
        price: parseFloat(newProduct.price).toFixed(2), // Format price to 2 decimal places
        category_id: Number(newProduct.category_id), // Convert category_id to a number
        stock_quantity: Number(newProduct.stock_quantity), // Convert stock_quantity to a number
        image: newProduct.image,
      };

      await createProduct(productData);
      setNewProduct({
        product_name: "",
        product_description: "",
        price: "",
        category_id: "", // Reset category ID on submit
        stock_quantity: "",
        image: "",
      });
    } catch {
      console.log("error creating a product");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result });
      };

      reader.readAsDataURL(file); // base64
    }
  };

  return (
    <motion.div
      className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8 max-w-xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-2xl font-semibold mb-6 text-emerald-300">
        Create New Product
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="product_name"
            className="block text-sm font-medium text-gray-300"
          >
            Product Name
          </label>
          <input
            type="text"
            id="product_name"
            name="product_name"
            value={newProduct.product_name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, product_name: e.target.value })
            }
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2
              px-3 text-white focus:outline-none focus:ring-2
              focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="product_description"
            className="block text-sm font-medium text-gray-300"
          >
            Description
          </label>
          <input
            type="text"
            id="product_description"
            name="product_description"
            value={newProduct.product_description}
            onChange={(e) =>
              setNewProduct({
                ...newProduct,
                product_description: e.target.value,
              })
            }
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2
              px-3 text-white focus:outline-none focus:ring-2
              focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-300"
          >
            Price
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={newProduct.price}
            onChange={(e) =>
              setNewProduct({ ...newProduct, price: e.target.value })
            }
            step="0.01"
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm 
              py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500
              focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="category_name"
            className="block text-sm font-medium text-gray-300"
          >
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            value={newProduct.category_id}
            onChange={(e) =>
              setNewProduct({ ...newProduct, category_id: e.target.value })
            }
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md
              shadow-sm py-2 px-3 text-white focus:outline-none 
              focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Select a category</option>
            {categories.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="stock_quantity"
            className="block text-sm font-medium text-gray-300"
          >
            Count in Stock
          </label>
          <input
            type="number"
            id="stock_quantity"
            name="stock_quantity"
            value={newProduct.stock_quantity}
            onChange={(e) =>
              setNewProduct({
                ...newProduct,
                stock_quantity: e.target.value ? parseInt(e.target.value) : "",
              })
            }
            step="1"
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm 
              py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500
              focus:border-emerald-500"
            required
          />
        </div>

        <div className="mt-1 flex items-center">
          <input
            type="file"
            id="image"
            className="sr-only"
            accept="image/*"
            onChange={handleImageChange}
          />
          <label
            htmlFor="image"
            className="cursor-pointer bg-gray-700 py-2 px-3 border border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Upload className="h-5 w-5 inline-block mr-2" />
            Upload Image
          </label>
          {newProduct.image && (
            <span className="ml-3 text-sm text-gray-400">Image uploaded </span>
          )}
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
            shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader
                className="mr-2 h-5 w-5 animate-spin"
                aria-hidden="true"
              />
              Loading...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Product
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default CreateProductForm;
