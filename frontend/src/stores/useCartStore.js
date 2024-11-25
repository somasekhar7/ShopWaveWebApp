import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,
  isCouponApplied: false,

  getMyCoupon: async () => {
    try {
      const response = await axios.get("/coupon");
      set({ coupon: response.data });
    } catch (error) {
      console.error("Error fetching coupon:", error);
    }
  },
  applyCoupon: async (code) => {
    try {
      const response = await axios.post("/coupon/validate", { code });
      set({ coupon: response.data, isCouponApplied: true });
      get().calculateTotals();
      toast.success("Coupon applied successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply coupon");
    }
  },
  removeCoupon: () => {
    set({ coupon: null, isCouponApplied: false });
    get().calculateTotals();
    toast.success("Coupon removed");
  },

  getCartItems: async () => {
    try {
      const res = await axios.get("/cart");
      set({ cart: res.data });
      get().calculateTotals();
    } catch (error) {
      set({ cart: [] });
      toast.error(error.response.data.message || "An error occurred");
    }
  },
  clearCart: async () => {
    try {
      // Call the backend endpoint to clear the cart
      await axios.delete("/cart"); // Assuming this is the endpoint you've set for clearing the cart

      // If the cart is successfully cleared, update the local state
      set({ cart: [], coupon: null, total: 0, subtotal: 0 });
      toast.success("Cart cleared successfully");
    } catch (error) {
      toast.error(
        error.response.data.message ||
          "An error occurred while clearing the cart"
      );
    }
  },

  addToCart: async (product) => {
    try {
      await axios.post("/cart", { productId: product.product_id });
      toast.success("Product added to cart");

      set((prevState) => {
        const existingItem = prevState.cart.find(
          (item) => item.product_id === product.product_id
        );
        const newCart = existingItem
          ? prevState.cart.map((item) =>
              item.product_id === product.product_id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [...prevState.cart, { ...product, quantity: 1 }];
        return { cart: newCart };
      });
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "An error occurred");
    }
  },
  removeFromCart: async (productId) => {
    await axios.delete(`/cart`, { data: { productId } });
    set((prevState) => ({
      cart: prevState.cart.filter((item) => item.product_id !== productId),
    }));
    get().calculateTotals();
  },
  updateQuantity: async (productId, newQuantity) => {
    try {
      await axios.put(`/cart/${productId}`, { quantity: newQuantity });
      set((prevState) => ({
        cart: prevState.cart.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: newQuantity }
            : item
        ),
      }));
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "Failed to update quantity");
    }
  },
  calculateTotals: () => {
    const { cart, coupon } = get();
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    let total = subtotal;

    if (coupon) {
      const discount = subtotal * (coupon.discountPercentage / 100);
      total = subtotal - discount;
    }

    set({ subtotal, total });
  },
}));
