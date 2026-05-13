import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  TextField,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  LocalShipping as DeliveryIcon,
  Store as StoreIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Payment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    delivery_method: '',
    delivery_address: '',
    delivery_notes: ''
  });

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const apiUrl = `/api/orders/${orderId}`;
      console.log('Fetching order details for orderId:', orderId);
      console.log('API URL:', apiUrl);
      console.log('User:', user);
      
      const response = await axios.get(apiUrl);
      const responseData = response.data;
      
      console.log('Full response data:', responseData);
      
      // The backend returns { order: {...}, items: [...], prescriptions: [...] }
      const orderData = responseData.order || responseData;
      const orderItems = responseData.items || [];
      
      console.log('Order data:', orderData);
      console.log('Order status:', orderData.status);
      console.log('Order items:', orderItems);
      
      // Allow payment for orders that are payment_pending (no prescription required) 
      // or prescription_approved (prescription was required and approved)
      if (orderData.status !== 'prescription_approved' && orderData.status !== 'payment_pending') {
        if (orderData.status === 'pending' || orderData.status === 'prescription_pending') {
          setError(`This order is not ready for payment. Current status: ${orderData.status}. Prescription validation is still pending.`);
        } else if (orderData.status === 'prescription_rejected') {
          setError(`This order cannot be processed for payment. Current status: ${orderData.status}. Prescription was rejected.`);
        } else if (orderData.status === 'paid' || orderData.status === 'completed') {
          setError(`This order has already been paid for. Current status: ${orderData.status}.`);
        } else {
          setError(`This order is not ready for payment. Current status: ${orderData.status}.`);
        }
        return;
      }
      
      // Add items to the order object
      const orderWithItems = {
        ...orderData,
        items: orderItems
      };
      
      setOrder(orderWithItems);
      setError('');
    } catch (error) {
      console.error('Fetch order error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Request URL:', error.config?.url);
      
      if (error.response?.status === 404) {
        setError(`Order not found. Please check and make sure you have access to this order.`);
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this order. Please make sure you are logged in as the correct customer.');
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (!error.response) {
        setError('Cannot connect to server. Please check if the backend server is running.');
      } else {
        setError(`Failed to fetch order details: ${error.response?.data?.message || error.message}. Status: ${error.response?.status}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setPaymentData({
      ...paymentData,
      [e.target.name]: e.target.value
    });
  };

  const getDeliveryFee = (method) => {
    const fees = {
      'pickup': 0,
      'home_delivery': 5.00,
      'express_delivery': 15.00
    };
    return fees[method] || 0;
  };

  const calculateTotal = () => {
    const orderTotal = parseFloat(order?.total_amount || 0);
    const deliveryFee = getDeliveryFee(paymentData.delivery_method);
    return orderTotal + deliveryFee;
  };

  const handlePayment = async () => {
    if (!paymentData.payment_method || !paymentData.delivery_method) {
      setError('Please select payment method and delivery method');
      return;
    }

    if (['home_delivery', 'express_delivery'].includes(paymentData.delivery_method) 
        && !paymentData.delivery_address.trim()) {
      setError('Delivery address is required for home/express delivery');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const response = await axios.post(`/api/orders/payment/${orderId}`, paymentData);
      
      setSuccess('Payment processed successfully! You will receive a confirmation email.');
      
      // Redirect to order status after 3 seconds
      setTimeout(() => {
        navigate('/order-status');
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (user?.role !== 'customer') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only customers can access payment page.
          </Typography>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
          <Alert severity="error">
            {error || "Order not found or not ready for payment."}
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/order-status')}>
              Back to Orders
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PaymentIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Payment & Checkout
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete Your Order
            </Typography>
          </Box>
        </Box>

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}   justifyContent="center">
          {/* Order Summary */}
          <Grid item xs={12} md={4} sx={{ width: 500}}>
            <Card sx={{border: '1px solid #e0e0e0', borderRadius: 2, p: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>
                
                <List dense>
                  {order.items?.map((item) => (
                    <ListItem key={item.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={`${item.quantity}x ${item.product_name}`}
                        secondary={`$${parseFloat(item.unit_price).toFixed(2)} each`}
                      />
                      <Typography variant="body2">
                        ${parseFloat(item.total_price).toFixed(2)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">${parseFloat(order.total_amount).toFixed(2)}</Typography>
                </Box>
                
                {paymentData.delivery_method && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Delivery Fee:</Typography>
                    <Typography variant="body2">${getDeliveryFee(paymentData.delivery_method).toFixed(2)}</Typography>
                  </Box>
                )}
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary.main">
                    ${calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Form */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CreditCardIcon sx={{ mr: 1 }} />
                  Payment Method
                </Typography>
                
                <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                  <RadioGroup
                    value={paymentData.payment_method}
                    onChange={(e) => handleInputChange({ target: { name: 'payment_method', value: e.target.value } })}
                    sx={{ gap: 1 }}
                  >
                    <FormControlLabel 
                      value="credit_card" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CreditCardIcon sx={{ mr: 1, fontSize: 20 }} />
                          Credit Card
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="debit_card" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CreditCardIcon sx={{ mr: 1, fontSize: 20 }} />
                          Debit Card
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="paypal" 
                      control={<Radio />} 
                      label="PayPal"
                    />
                    <FormControlLabel 
                      value="bank_transfer" 
                      control={<Radio />} 
                      label="Bank Transfer"
                    />
                  </RadioGroup>
                </FormControl>

                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
                  <DeliveryIcon sx={{ mr: 1 }} />
                  Delivery Method
                </Typography>
                
                <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
                  <RadioGroup
                    value={paymentData.delivery_method}
                    onChange={(e) => handleInputChange({ target: { name: 'delivery_method', value: e.target.value } })}
                    sx={{ gap: 1 }}
                  >
                    <FormControlLabel 
                      value="pickup" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <StoreIcon sx={{ mr: 1, fontSize: 20 }} />
                            Store Pickup
                            <Chip label="FREE" size="small" color="success" sx={{ ml: 1 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                            Pick up at our pharmacy location
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="home_delivery" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DeliveryIcon sx={{ mr: 1, fontSize: 20 }} />
                            Home Delivery
                            <Chip label="$5.00" size="small" color="primary" sx={{ ml: 1 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                            Standard delivery (3-5 business days)
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel 
                      value="express_delivery" 
                      control={<Radio />} 
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DeliveryIcon sx={{ mr: 1, fontSize: 20 }} />
                            Express Delivery
                            <Chip label="$15.00" size="small" color="warning" sx={{ ml: 1 }} />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                            Next day delivery
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {/* Delivery Address */}
                {['home_delivery', 'express_delivery'].includes(paymentData.delivery_method) && (
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      required
                      name="delivery_address"
                      label="Delivery Address"
                      multiline
                      rows={3}
                      value={paymentData.delivery_address}
                      onChange={handleInputChange}
                      placeholder="Enter your complete delivery address"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      name="delivery_notes"
                      label="Delivery Notes (Optional)"
                      multiline
                      rows={2}
                      value={paymentData.delivery_notes}
                      onChange={handleInputChange}
                      placeholder="Special instructions for delivery (e.g., gate code, preferred time)"
                    />
                  </Box>
                )}

                {/* Payment Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4}}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/order-status')}
                    sx={{ mr: 2 }}
                  >
                    Back to Orders
                  </Button>
                  
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handlePayment}
                    disabled={paymentLoading || !paymentData.payment_method || !paymentData.delivery_method}
                    startIcon={paymentLoading ? <CircularProgress size={20} /> : <PaymentIcon />}
                    sx={{ minWidth: 200 }}
                  >
                    {paymentLoading ? 'Processing...' : `Pay $${calculateTotal().toFixed(2)}`}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Payment;
