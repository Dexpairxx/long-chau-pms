import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updateLoading, setUpdateLoading] = useState({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [clearCartDialogOpen, setClearCartDialogOpen] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [tempQuantities, setTempQuantities] = useState({});
  const [errorTimer, setErrorTimer] = useState(null);
  const [successTimer, setSuccessTimer] = useState(null);

  // Fetch cart items
  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/cart');
      setCartItems(response.data.cartItems || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch cart items');
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'customer') {
      fetchCart();
    }
  }, [user]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (errorTimer) {
        clearTimeout(errorTimer);
      }
      if (successTimer) {
        clearTimeout(successTimer);
      }
    };
  }, [errorTimer, successTimer]);

  // Auto-clear error messages
  const setErrorWithTimer = (message, duration = 4000) => {
    // Clear any existing timer
    if (errorTimer) {
      clearTimeout(errorTimer);
    }
    
    setError(message);
    const timer = setTimeout(() => {
      setError('');
      setErrorTimer(null);
    }, duration);
    setErrorTimer(timer);
  };

  // Auto-clear success messages  
  const setSuccessWithTimer = (message, duration = 3000) => {
    // Clear any existing timer
    if (successTimer) {
      clearTimeout(successTimer);
    }
    
    setSuccess(message);
    const timer = setTimeout(() => {
      setSuccess('');
      setSuccessTimer(null);
    }, duration);
    setSuccessTimer(timer);
  };

  // Update quantity
  const updateQuantity = async (cartItemId, newQuantity) => {
    const MAX_CART_QUANTITY = 10000;
    
    // Validate quantity when updating
    const quantityNum = parseFloat(newQuantity);
    if (isNaN(quantityNum) || !Number.isInteger(quantityNum)) {
      setErrorWithTimer('Please enter a valid whole number for quantity');
      return;
    }
    
    if (quantityNum < 1) {
      setErrorWithTimer('Quantity must be greater than 0');
      return;
    }
    
    // Frontend validation for maximum quantity
    if (quantityNum > MAX_CART_QUANTITY) {
      setErrorWithTimer(`Maximum quantity per product is ${MAX_CART_QUANTITY.toLocaleString()}`);
      return;
    }

    setUpdateLoading(prev => ({ ...prev, [cartItemId]: true }));
    try {
      const response = await axios.put(`/api/cart/update/${cartItemId}`, {
        quantity: quantityNum
      });

      if (response.data.success) {
        setSuccessWithTimer(response.data.message);
        fetchCart(); // Refresh cart
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update quantity';
      
      // Check if it's a specific quantity limit error and provide helpful info
      if (error.response?.data?.maxQuantity) {
        const { maxQuantity, currentQuantity, maxAddable } = error.response.data;
        setErrorWithTimer(`${errorMessage}. Current: ${currentQuantity}, Max allowed: ${maxQuantity}${maxAddable ? `, Can add: ${maxAddable} more` : ''}`, 5000);
      } else {
        setErrorWithTimer(errorMessage);
      }
    } finally {
      setUpdateLoading(prev => ({ ...prev, [cartItemId]: false }));
    }
  };

  // Remove item
  const removeItem = async (cartItemId) => {
    setUpdateLoading(prev => ({ ...prev, [cartItemId]: true }));
    try {
      const response = await axios.delete(`/api/cart/remove/${cartItemId}`);

      if (response.data.success) {
        setSuccessWithTimer(response.data.message);
        fetchCart(); // Refresh cart
      }
    } catch (error) {
      setErrorWithTimer(error.response?.data?.message || 'Failed to remove item');
    } finally {
      setUpdateLoading(prev => ({ ...prev, [cartItemId]: false }));
    }
  };

  // Trigger confirmation dialog for clearing a cart item
  const handleClearCartClick = () => {
    setClearCartDialogOpen(true);  
  };

  // Confirm clear action
  const confirmClearCartItem = async () => {
    try {
      const response = await axios.delete('/api/cart/clear');

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchCart(); 
        setTimeout(() => setSuccess(''), 3000);
        setClearCartDialogOpen(false);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to clear cart');
      setTimeout(() => setError(''), 3000);
      setClearCartDialogOpen(false);
    }
  };

  // Cancel clear action
  const handleCancelClearCartItem = () => {
    setClearCartDialogOpen(false);
  };


  // Create order from cart
  const createOrder = async () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setCheckoutLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/orders/create');

      if (response.data.orderId) {
        const { orderId, requiresPrescription, status } = response.data;
        
        setSuccess(`Order created successfully!`);
        
        // Navigate to order status page after a short delay
        setTimeout(() => {
          navigate('/order-status', { 
            state: { 
              newOrderId: orderId, 
              requiresPrescription: requiresPrescription,
              orderStatus: status
            } 
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Create order error:', error);
      
      // Handle stock errors specifically
      if (error.response?.data?.stockErrors) {
        const stockErrors = error.response.data.stockErrors;
        setStockError(stockErrors);
        // Auto-hide stock error after 10 seconds
        setTimeout(() => setStockError(null), 5000);
      } else {
        setError(error.response?.data?.message || 'Failed to create order');
        setTimeout(() => setError(''), 8000);
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (user?.role !== 'customer') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only customers can access the shopping cart.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CartIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Shopping Cart
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review your items before checkout
            </Typography>
          </Box>
        </Box>

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Custom Stock Error Message */}
        {stockError && (
          <Box
            sx={{
              mb: 3,
              p: 3,
              borderRadius: 2,
              border: '1px solid #f44336',
              backgroundColor: '#ffebee',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(244, 67, 54, 0.1)'
            }}
          >
            <IconButton
              onClick={() => setStockError(null)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#f44336',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.1)'
                }
              }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <WarningIcon sx={{ color: '#f44336', mr: 1.5, mt: 0.5 }} />
              <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                Insufficient Stock
              </Typography>
            </Box>
            
            <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
              The following items don't have enough stock available:
            </Typography>
            
            <Box sx={{ pl: 2 }}>
              {stockError.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#f44336',
                      mr: 2
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#333', fontWeight: 500 }}>
                    {item.product}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Typography variant="body2" sx={{ color: '#666', mt: 2, fontStyle: 'italic' }}>
              Please update your cart quantities and try again.
            </Typography>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : cartItems.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CartIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Your cart is empty
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Add some products to get started
              </Typography>
              <Button 
                variant="contained" 
                href="/home"
                sx={{ mt: 2 }}
              >
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {/* Cart Items */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Cart Items ({cartItems.length})
                    </Typography>
                    <Button 
                      color="error" 
                      onClick={handleClearCartClick}
                      disabled={Object.values(updateLoading).some(loading => loading)}
                    >
                      Clear Cart
                    </Button>
                  </Box>
                  
                  <TableContainer sx={{ maxWidth: 730}}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cartItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar
                                  src={item.image_url}
                                  alt={item.name}
                                  sx={{ width: 60, height: 60, mr: 2 }}
                                  variant="rounded"
                                />
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {item.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.category_name}
                                  </Typography>
                                  {item.requires_prescription ? (
                                    <Typography variant="caption" color="warning.main">
                                      Prescription Required
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="success.main">
                                      No Prescription Needed
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || updateLoading[item.id]}
                                >
                                  <RemoveIcon />
                                </IconButton>
                                <TextField
                                  type="number"
                                  value={tempQuantities[item.id] !== undefined ? tempQuantities[item.id] : item.quantity}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    // Allow any input - no validation here
                                    setTempQuantities(prev => ({
                                      ...prev,
                                      [item.id]: newValue
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const newQuantity = e.target.value;
                                    
                                    // Only update if there's actually a change and value exists
                                    if (newQuantity !== '' && newQuantity != item.quantity) {
                                      updateQuantity(item.id, newQuantity);
                                    }
                                    // Clear temp value after update
                                    setTempQuantities(prev => {
                                      const updated = { ...prev };
                                      delete updated[item.id];
                                      return updated;
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newQuantity = e.target.value;
                                      
                                      // Only update if there's actually a change and value exists
                                      if (newQuantity !== '' && newQuantity != item.quantity) {
                                        updateQuantity(item.id, newQuantity);
                                      }
                                      // Clear temp value after update
                                      setTempQuantities(prev => {
                                        const updated = { ...prev };
                                        delete updated[item.id];
                                        return updated;
                                      });
                                      e.target.blur(); // Remove focus
                                    }
                                  }}
                                  inputProps={{ 
                                    style: { textAlign: 'center', width: '60px' }
                                  }}
                                  size="small"
                                  sx={{ mx: 1 }}
                                  disabled={updateLoading[item.id]}
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={updateLoading[item.id]}
                                >
                                  <AddIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="subtitle1" fontWeight="bold">
                                {formatCurrency(item.subtotal)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                color="error"
                                onClick={() => removeItem(item.id)}
                                disabled={updateLoading[item.id]}
                              >
                                {updateLoading[item.id] ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <DeleteIcon />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Order Summary */}
            <Grid item xs={12} md={4}>
              <Card sx={{ position: 'sticky', top: 90 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Order Summary
                  </Typography>
                  
                  <Box sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Subtotal:</Typography>
                      <Typography>{formatCurrency(subtotal)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Tax (10%):</Typography>
                      <Typography>{formatCurrency(tax)}</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(total)}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={checkoutLoading ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
                    sx={{ mb: 2 }}
                    onClick={createOrder}
                    disabled={checkoutLoading || cartItems.length === 0}
                  >
                    {checkoutLoading ? 'Loading...' : 'Place Order'}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    href="/home"
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        
      </Box>

      <Dialog
        open={clearCartDialogOpen}
        onClose={handleCancelClearCartItem}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirm Clear</DialogTitle>
        <DialogContent>
          Are you sure you want to clear your entire cart?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClearCartItem} color="primary" sx={{mr:2}}>
            Cancel
          </Button>
          <Button onClick={confirmClearCartItem} color="error">
            Clear
          </Button>
        </DialogActions>
      </Dialog>      
      

    </Container>
  );
};

export default Cart;