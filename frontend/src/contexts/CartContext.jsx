import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);

  // Fetch cart count
  const fetchCartCount = async () => {
    if (user?.role !== 'customer') {
      setCartCount(0);
      return;
    }

    try {
      const response = await axios.get('/api/cart');
      const items = response.data.cartItems || [];
      setCartItems(items);
      
      // Calculate total quantity
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(totalCount);
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await axios.post('/api/cart/add', {
        product_id: productId,
        quantity: quantity
      });

      if (response.data.success) {
        await fetchCartCount(); // Refresh cart count
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to add item to cart' 
      };
    }
  };

  // Update cart item quantity
  const updateCartItem = async (cartItemId, quantity) => {
    try {
      const response = await axios.put(`/api/cart/update/${cartItemId}`, {
        quantity: quantity
      });

      if (response.data.success) {
        await fetchCartCount(); // Refresh cart count
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update cart item' 
      };
    }
  };

  // Remove item from cart
  const removeFromCart = async (cartItemId) => {
    try {
      const response = await axios.delete(`/api/cart/remove/${cartItemId}`);

      if (response.data.success) {
        await fetchCartCount(); // Refresh cart count
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to remove cart item' 
      };
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      const response = await axios.delete('/api/cart/clear');

      if (response.data.success) {
        await fetchCartCount(); // Refresh cart count
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to clear cart' 
      };
    }
  };

  // Fetch cart count when user changes
  useEffect(() => {
    fetchCartCount();
  }, [user]);

  const value = {
    cartCount,
    cartItems,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart: fetchCartCount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
