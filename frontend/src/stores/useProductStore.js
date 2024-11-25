import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

export const useProductStore = create((set) => ({
  products: [],
  loading: false,

  setProducts: (products) => set({ products }),

  createProduct: async (productData) => {
    set({ loading: true });

    const validateProductData = (data) => {
      return (
        data.product_name &&
        data.product_description &&
        data.price &&
        data.category_id &&
        data.stock_quantity &&
        data.image
      );
    };

    if (!validateProductData(productData)) {
      toast.error("Please fill in all required fields");
      set({ loading: false });
      return;
    }

    try {
      const res = await axios.post("/products", productData);
      if (res.status === 200 || res.status === 201) {
        set((prevState) => ({
          products: [...(prevState.products || []), res.data],
          loading: false,
        }));
        toast.success("Product created successfully");
      } else {
        throw new Error("Unexpected response from the server");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(
        (error.response && error.response.data.error) ||
          "Error occurred while creating the product"
      );
      set({ loading: false });
    }
  },

  fetchAllProducts: async () => {
    set({ loading: true });
    try {
      const response = await axios.get("/products/");
      set({ products: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch products", loading: false });
      toast.error(error.response.data.error || "Failed to fetch products");
    }
  },
  fetchProductsByCategory: async (category) => {
    set({ loading: true });
    try {
      const response = await axios.get(`/products/category/${category}`);
      set({ products: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch products", loading: false });
      toast.error(error.response.data.error || "Failed to fetch products");
    }
  },
  deleteProduct: async (product_id) => {
    set({ loading: true });
    try {
      const response = await axios.delete(`/products/${product_id}`);
      if (response.status === 200 || response.status === 204) {
        set((prevState) => {
          const updatedProducts = prevState.products.filter(
            (product) => product.product_id !== product_id // Ensure this matches your schema
          );
          console.log("Updated products:", updatedProducts); // Debugging line
          return {
            products: updatedProducts,
            loading: false,
          };
        });
        toast.success("Product deleted successfully");
      } else {
        throw new Error("Unexpected response from the server");
      }
    } catch (error) {
      console.error("Delete product error:", error); // Debugging line
      set({ loading: false });
      toast.error(error.response?.data?.error || "Failed to delete product");
    }
  },

  toggleFeaturedProduct: async (product_id) => {
    set({ loading: true });
    try {
      const response = await axios.patch(`/products/${product_id}`);
      // this will update the isFeatured prop of the product
      set((prevProducts) => ({
        products: prevProducts.products.map((product) =>
          product.product_id === product_id
            ? { ...product, isFeatured: response.data.isFeatured }
            : product
        ),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.error || "Failed to update product");
    }
  },
  
  fetchFeaturedProducts: async () => {
    set({ loading: true });
    try {
      const response = await axios.get("/products/featured");
      set({ products: response.data, loading: false });
    } catch (error) {
      set({ error: "Failed to fetch products", loading: false });
      console.log("Error fetching featured products:", error);
    }
  },
}));
