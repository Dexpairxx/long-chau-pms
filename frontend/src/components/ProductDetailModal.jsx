import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  IconButton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  LocalPharmacy as PharmacyIcon
} from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';

const ProductDetailModal = ({ product, open, onClose }) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errorTimer, setErrorTimer] = useState(null);

  // Reset quantity to 1 when modal opens with a product
  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setError('');
      setSuccess('');
      // Clear any existing error timer
      if (errorTimer) {
        clearTimeout(errorTimer);
        setErrorTimer(null);
      }
    }
  }, [open, product, errorTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimer) {
        clearTimeout(errorTimer);
      }
    };
  }, [errorTimer]);

  const handleQuantityChange = (newQuantity) => {
    // Allow any input - no validation here, just clear errors if any
    setQuantity(newQuantity);
    if (error) {
      setError(''); // Clear any existing errors when user changes input
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Validate quantity when clicking Add to Cart
    const MAX_CART_QUANTITY = 10000; // Database INT limit (reasonable business limit)
    
    // Check if quantity is a valid number
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || !Number.isInteger(quantityNum)) {
      setError('Please enter a valid whole number for quantity');
      // Auto-clear error after 4 seconds
      const timer = setTimeout(() => {
        setError('');
        setErrorTimer(null);
      }, 4000);
      setErrorTimer(timer);
      return;
    }
    
    // Check if quantity is positive
    if (quantityNum <= 0) {
      setError('Quantity must be greater than 0');
      // Auto-clear error after 4 seconds
      const timer = setTimeout(() => {
        setError('');
        setErrorTimer(null);
      }, 4000);
      setErrorTimer(timer);
      return;
    }
    
    // Check if quantity exceeds database limit
    if (quantityNum > MAX_CART_QUANTITY) {
      setError(`Maximum quantity per product is ${MAX_CART_QUANTITY.toLocaleString()}`);
      // Auto-clear error after 4 seconds
      const timer = setTimeout(() => {
        setError('');
        setErrorTimer(null);
      }, 4000);
      setErrorTimer(timer);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addToCart(product.id, quantityNum);
      if (result.success) {
        setSuccess(`Added ${quantityNum.toLocaleString()} ${product.name} to cart!`);
        setTimeout(() => {
          setSuccess('');
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Failed to add item to cart');
        // Auto-clear error after 4 seconds for longer messages
        const timer = setTimeout(() => {
          setError('');
          setErrorTimer(null);
        }, 4000);
        setErrorTimer(timer);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = error.message || 'Failed to add item to cart';
      setError(errorMessage);
      // Auto-clear error after 4 seconds
      const timer = setTimeout(() => {
        setError('');
        setErrorTimer(null);
      }, 4000);
      setErrorTimer(timer);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Clear any existing error timer
    if (errorTimer) {
      clearTimeout(errorTimer);
      setErrorTimer(null);
    }
    setQuantity(1);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Product Details
        </Typography>
        <IconButton onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Product Image */}
          <Grid item xs={12} md={5}>
            <Box
              component="img"
              src={product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}
              alt={product.name}
              sx={{
                width: '100%',
                height: 300,
                objectFit: 'cover',
                borderRadius: 2,
                border: 1,
                borderColor: 'divider'
              }}
            />
          </Grid>

          {/* Product Information */}
          <Grid item xs={12} md={7}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Product Name */}
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {product.name}
              </Typography>

              {/* Prescription Information */}
              <Box sx={{ mb: 2 }}>
                {product.requires_prescription ? (
                  <Chip
                    icon={<PharmacyIcon />}
                    label="Prescription Required"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <Chip
                    label="No Prescription Needed"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </Box>

              {/* Price */}
              <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 'bold', mb: 2 }}>
                ${parseFloat(product.price || 0).toFixed(2)}
              </Typography>

              {/* Description */}
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                {product.description || 'No description available for this product.'}
              </Typography>

              {/* Quantity Selector */}
              <Box sx={{ mt: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Quantity:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <IconButton
                      onClick={() => {
                        const currentQty = parseInt(quantity) || 0;
                        const newQty = Math.max(1, currentQty - 1);
                        handleQuantityChange(newQty);
                      }}
                      sx={{ 
                        border: 1, 
                        borderColor: 'divider',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      <RemoveIcon />
                    </IconButton>                    <TextField
                      value={quantity}
                      onChange={(e) => {
                        // Allow any input - no validation here
                        handleQuantityChange(e.target.value);
                      }}
                      type="number"
                      inputProps={{ 
                        style: { textAlign: 'center' }
                      }}
                      sx={{ width: 80 }}
                      size="small"
                    />

                    <IconButton
                      onClick={() => {
                        const currentQty = parseInt(quantity) || 0;
                        const newQty = currentQty + 1;
                        const MAX_CART_QUANTITY = 10000;
                        
                        if (newQty > MAX_CART_QUANTITY) {
                          setError(`Maximum quantity allowed is ${MAX_CART_QUANTITY.toLocaleString()}`);
                          // Auto-clear error after 3 seconds
                          const timer = setTimeout(() => {
                            setError('');
                            setErrorTimer(null);
                          }, 3000);
                          setErrorTimer(timer);
                        } else {
                          handleQuantityChange(newQty);
                        }
                      }}
                      sx={{ 
                        border: 1, 
                        borderColor: 'divider',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>

                  {/* Total Price */}
                  <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    Total: ${(parseFloat(product.price || 0) * (parseFloat(quantity) || 0)).toFixed(2)}
                  </Typography>
                </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} variant="outlined" size="large">
          Cancel
        </Button>
        <Button
          onClick={handleAddToCart}
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          sx={{ minWidth: 150 }}
        >
          {loading ? 'Adding...' : 'Add to Cart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetailModal;
