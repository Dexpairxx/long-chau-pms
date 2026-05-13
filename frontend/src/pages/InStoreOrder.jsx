import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  LocalPharmacy as PharmacyIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const InStoreOrder = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Product data
  const [products, setProducts] = useState([]);

  // Order state
  const [customerInfo, setCustomerInfo] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [orderItems, setOrderItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [notes, setNotes] = useState('');

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);

  useEffect(() => {
    if (user?.role === 'cashier') {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      console.log('Products response:', response.data);

      if (response.data && response.data.products && Array.isArray(response.data.products)) {
        setProducts(response.data.products.filter(product => product.status === 'active' && product.stock_quantity > 0));
      } else {
        console.error('Invalid products response format:', response.data);
        setError('Invalid products data format');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    }
  };

  const addToCart = () => {
    if (!selectedProduct || quantity <= 0) {
      setError('Please select a product and valid quantity');
      return;
    }

    if (quantity > selectedProduct.stock_quantity) {
      setError(`Only ${selectedProduct.stock_quantity} items available`);
      return;
    }

    // Check if product already in cart
    const existingItemIndex = orderItems.findIndex(item => item.product_id === selectedProduct.id);

    if (existingItemIndex >= 0) {
      const existingItem = orderItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > selectedProduct.stock_quantity) {
        setError(`Total quantity cannot exceed ${selectedProduct.stock_quantity} items`);
        return;
      }

      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total_price: newQuantity * selectedProduct.price
      };
      setOrderItems(updatedItems);
    } else {
      const newItem = {
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        price: selectedProduct.price,
        quantity: quantity,
        total_price: quantity * selectedProduct.price,
        requires_prescription: selectedProduct.requires_prescription,
        stock_quantity: selectedProduct.stock_quantity
      };
      setOrderItems([...orderItems, newItem]);
    }

    // Reset form
    setSelectedProduct(null);
    setQuantity(1);
    setError('');
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    const item = orderItems[index];
    if (newQuantity > item.stock_quantity) {
      setError(`Only ${item.stock_quantity} items available for ${item.name}`);
      return;
    }

    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      total_price: newQuantity * item.price
    };
    setOrderItems(updatedItems);
    setError('');
  };

  const removeItem = (index) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleCreateOrder = () => {
    if (!customerInfo.full_name.trim()) {
      setError('Please enter customer name');
      return;
    }

    if (orderItems.length === 0) {
      setError('Please add items to the order');
      return;
    }

    const total = calculateTotal();
    const summary = {
      customer: customerInfo,
      items: orderItems,
      total: total,
      paymentMethod,
      deliveryMethod,
      notes
    };

    setOrderSummary(summary);
    setConfirmDialog(true);
  };

  const confirmOrder = async () => {
    try {
      setLoading(true);

      const orderData = {
        customer_info: customerInfo,
        order_type: 'in_store',
        total_amount: calculateTotal(),
        status: 'completed',
        payment_method: paymentMethod,
        payment_status: 'completed',
        delivery_method: deliveryMethod,
        delivery_fee: 0,
        final_total: calculateTotal(),
        notes: notes,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total_price
        }))
      };

      const response = await axios.post('/api/orders/in-store', orderData);

      setSuccess(`Order #${response.data.id} created successfully!`);
      setConfirmDialog(false);

      // Reset form
      setCustomerInfo({
        full_name: '',
        email: '',
        phone: ''
      });
      setOrderItems([]);
      setPaymentMethod('cash');
      setDeliveryMethod('pickup');
      setNotes('');
      setOrderSummary(null);

      // Refresh products to update stock
      fetchProducts();

    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  if (user?.role !== 'cashier') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only cashiers can access in-store ordering.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CartIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              In-Store Order
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create orders for walk-in customers
            </Typography>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Product Selection */}
          <Grid item xs={12} sm={8} order={{ xs: 1, md: 1 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Customer Information */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Customer Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Customer Name"
                      value={customerInfo.full_name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, full_name: e.target.value })}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Email (Optional)"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      type="email"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Phone (Optional)"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Product Selection */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PharmacyIcon sx={{ mr: 1 }} />
                  Add Products
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6} sx={{ minWidth: 250 }}>
                    <Autocomplete
                      value={selectedProduct}
                      onChange={(event, newValue) => setSelectedProduct(newValue)}
                      options={products}
                      getOptionLabel={(option) => `${option.name} - ${formatCurrency(option.price)} (Stock: ${option.stock_quantity})`}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Product"
                          placeholder="Search products"
                          fullWidth
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      type="number"
                      label="Quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1, max: selectedProduct?.stock_quantity || 999 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addToCart}
                      disabled={!selectedProduct}
                      fullWidth
                    >
                      Add to Cart
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Items
                </Typography>
                {orderItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No items added yet
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="center">Price</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="center">Total</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {item.name}
                                </Typography>
                                {item.requires_prescription && (
                                  <Chip label="Prescription Required" size="small" color="warning" sx={{ mt: 0.5 }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              {formatCurrency(item.price)}
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => updateQuantity(index, item.quantity - 1)}
                                >
                                  <RemoveIcon />
                                </IconButton>
                                <Typography sx={{ mx: 2, minWidth: '20px', textAlign: 'center' }}>
                                  {item.quantity}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => updateQuantity(index, item.quantity + 1)}
                                  disabled={item.quantity >= item.stock_quantity}
                                >
                                  <AddIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                              {formatCurrency(item.total_price)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                color="error"
                                onClick={() => removeItem(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid item xs={12} sm={4} order={{ xs: 2, md: 2 }}>
            <Card sx={{ position: 'sticky', top: 100 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PaymentIcon sx={{ mr: 1 }} />
                  Order Summary
                </Typography>

                {customerInfo.full_name && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary">
                      Customer:
                    </Typography>
                    <Typography variant="body2">
                      {customerInfo.full_name}
                    </Typography>
                    {customerInfo.email && (
                      <Typography variant="caption" color="text.secondary">
                        {customerInfo.email}
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6} sx={{ minWidth: 200 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="Payment Method"
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="credit_card">Credit Card</MenuItem>
                        <MenuItem value="debit_card">Debit Card</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sx={{ minWidth: 200 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Delivery Method</InputLabel>
                      <Select
                        value={deliveryMethod}
                        label="Delivery Method"
                        onChange={(e) => setDeliveryMethod(e.target.value)}
                      >
                        <MenuItem value="pickup">Pickup</MenuItem>
                        <MenuItem value="home_delivery">Home Delivery</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <TextField
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={3}
                    fullWidth
                    size="small"
                  />
                </Grid>


                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      Items ({orderItems.length}):
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(calculateTotal())}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      Delivery Fee:
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(0)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="h6">
                      Total:
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(calculateTotal())}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCreateOrder}
                  disabled={!customerInfo.full_name.trim() || orderItems.length === 0}
                  sx={{ mt: 2 }}
                >
                  Complete Order
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Confirm Order
          </DialogTitle>
          <DialogContent>
            {orderSummary && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Customer: {orderSummary.customer.full_name}
                </Typography>

                <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Qty</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderSummary.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Payment Method:</Typography>
                  <Typography sx={{ textTransform: 'capitalize' }}>{orderSummary.paymentMethod}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Delivery Method:</Typography>
                  <Typography sx={{ textTransform: 'capitalize' }}>{orderSummary.deliveryMethod}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <Typography variant="h6">Total Amount:</Typography>
                  <Typography variant="h6" color="primary">{formatCurrency(orderSummary.total)}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmOrder}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {loading ? 'Creating...' : 'Confirm Order'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default InStoreOrder;
