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
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  CircularProgress,
  FormControlLabel,
  Switch,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  AttachMoney as PriceIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Warehouse = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [openPriceDialog, setOpenPriceDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [priceProduct, setPriceProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    stock_quantity: '',
    requires_prescription: false,
    image_url: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch all products
  // Add state for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || product.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');
      setProducts(response.data.products);
      setError('');
    } catch (error) {
      setError('Failed to fetch products data');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories/all');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleDialogOpen = (product = null) => {
    setEditingProduct(product);
    setOpenDialog(true);
    setFormData(product ? {
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      price: product.price,
      stock_quantity: product.stock_quantity,
      requires_prescription: product.requires_prescription === 1,
      image_url: product.image_url || ''
    } : {
      name: '',
      description: '',
      category_id: '',
      price: '',
      stock_quantity: '',
      requires_prescription: false,
      image_url: ''
    });
    setFormError('');
    setSelectedFile(null);
    setImagePreview('');
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setFormError('');
    setSelectedFile(null);
    setImagePreview('');
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setFormError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image file must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setFormError('');

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Upload image to server
  const uploadImage = async () => {
    if (!selectedFile) return null;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post('/api/upload/product-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.imagePath;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleStockDialogOpen = (product) => {
    setStockProduct(product);
    setStockQuantity('');
    setOpenStockDialog(true);
  };

  const handleStockDialogClose = () => {
    setOpenStockDialog(false);
    setStockProduct(null);
    setStockQuantity('');
  };

  const handlePriceDialogOpen = (product) => {
    setPriceProduct(product);
    setNewPrice(product.price.toString());
    setOpenPriceDialog(true);
  };

  const handlePriceDialogClose = () => {
    setOpenPriceDialog(false);
    setPriceProduct(null);
    setNewPrice('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      let productData = { ...formData };

      // Upload image if a new file is selected
      if (selectedFile) {
        try {
          const imagePath = await uploadImage();
          productData.image_url = imagePath;
        } catch (uploadError) {
          setFormError('Failed to upload image. Please try again.');
          setFormLoading(false);
          return;
        }
      }

      if (editingProduct) {
        // Update existing product
        await axios.put(`/api/products/${editingProduct.id}`, productData);
      } else {
        // Create new product
        await axios.post('/api/products', productData);
      }
      await fetchProducts(); // Refresh the products list
      handleDialogClose();
    } catch (error) {
      setFormError(error.response?.data?.message || `Failed to ${editingProduct ? 'update' : 'create'} product`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const product = products.find(p => p.id === productId);
    setDeletingProduct(product);
    setOpenDeleteDialog(true);
  };

  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
    setDeletingProduct(null);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    try {
      await axios.delete(`/api/products/${deletingProduct.id}`);
      await fetchProducts();
      handleDeleteDialogClose();
    } catch (error) {
      setError('Failed to delete product');
      handleDeleteDialogClose();
    }
  };

  const handleStockUpdate = async () => {
    if (!stockQuantity || stockQuantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    try {
      const newStock = stockProduct.stock_quantity + parseInt(stockQuantity);
      await axios.patch(`/api/products/${stockProduct.id}/stock`, { 
        stock_quantity: newStock 
      });
      await fetchProducts();
      handleStockDialogClose();
      setError('');
    } catch (error) {
      setError('Failed to update stock');
    }
  };

  const handlePriceUpdate = async () => {
    if (!newPrice || newPrice <= 0) {
      setError('Please enter a valid price');
      return;
    }

    try {
      await axios.put(`/api/products/${priceProduct.id}`, { 
        price: parseFloat(newPrice) 
      });
      await fetchProducts();
      handlePriceDialogClose();
      setError('');
    } catch (error) {
      setError('Failed to update price');
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'error' };
    if (quantity < 10) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isBranchManager = user?.role === 'branch_manager';
  const canEditStock = user?.role === 'branch_manager' || user?.role === 'cashier';

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}> {/* Add padding-top for fixed navbar */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 3 },
          mb: 3 
        }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
              Warehouse Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
              Manage product inventory and stock levels
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchProducts}
              disabled={loading}
              fullWidth={isMobile}
              sx={{ minWidth: { xs: 'auto', sm: 120 } }}
            >
              Refresh
            </Button>
            {isBranchManager && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleDialogOpen()}
                fullWidth={isMobile}
                sx={{ 
                  minWidth: { xs: 'auto', sm: 140 },
                  fontSize: { xs: '0.875rem', md: '0.875rem' }
                }}
              >
                Add Product
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Search and Filter Section */}
        <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 2, md: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'stretch'
          }}>
            <TextField
              label="Search products..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              sx={{ flex: { xs: 1, sm: 2 } }}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
              size="medium"
            />
            <FormControl sx={{ 
              minWidth: { xs: '100%', sm: 180 },
              flex: { xs: 1, sm: 1 }
            }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
                size="medium"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.name}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <Card>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 3
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Product Inventory ({filteredProducts.length} of {products.length} items)
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Total Stock: ${products.reduce((sum, p) => sum + p.stock_quantity, 0)}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  label={`Low Stock: ${products.filter(p => p.stock_quantity <= 10).length}`}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
                {(searchTerm || categoryFilter) && (
                  <Chip 
                    label="Filtered"
                    color="info"
                    variant="outlined"
                    size="small"
                    onDelete={() => {
                      setSearchTerm('');
                      setCategoryFilter('');
                    }}
                  />
                )}
              </Box>
            </Box>
            
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer 
                component={Paper} 
                variant="outlined" 
                sx={{ 
                  minHeight: 600, 
                  maxHeight: { xs: 400, md: 800 }, 
                  overflow: 'auto',
                  borderRadius: 2
                }}
              >
                <Table 
                  stickyHeader 
                  size="medium" 
                  sx={{ 
                    '& .MuiTableCell-root': { 
                      padding: { xs: '8px 12px', md: '12px 16px' } 
                    },
                    '& .MuiTableHead-root .MuiTableCell-root': {
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600
                    }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: { xs: 80, md: 100 } }}>Image</TableCell>
                      <TableCell sx={{ minWidth: { xs: 150, md: 200 } }}>Product</TableCell>
                      <TableCell sx={{ minWidth: { xs: 100, md: 140 }, display: { xs: 'none', sm: 'table-cell' } }}>Category</TableCell>
                      <TableCell sx={{ minWidth: { xs: 80, md: 100 } }}>Price</TableCell>
                      <TableCell sx={{ minWidth: { xs: 70, md: 100 } }}>Stock</TableCell>
                      <TableCell sx={{ minWidth: { xs: 80, md: 100 } }}>Status</TableCell>
                      <TableCell sx={{ minWidth: { xs: 100, md: 130 }, display: { xs: 'none', md: 'table-cell' } }}>Prescription</TableCell>
                      {(isBranchManager || canEditStock) && (
                        <TableCell sx={{ minWidth: { xs: 120, md: 180 } }}>Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={isBranchManager || canEditStock ? 8 : 7}
                          align="center"
                          sx={{ py: 8 }}
                        >
                          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="h6" gutterBottom>
                              {searchTerm || categoryFilter ? 'No products match your filters' : 'No products found'}
                            </Typography>
                            <Typography variant="body2">
                              {searchTerm || categoryFilter 
                                ? 'Try adjusting your search terms or category filter'
                                : 'Start by adding some products to your inventory'
                              }
                            </Typography>
                            {(searchTerm || categoryFilter) && (
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  setSearchTerm('');
                                  setCategoryFilter('');
                                }}
                                sx={{ mt: 2 }}
                              >
                                Clear Filters
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                      <TableRow key={product.id} hover sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                        <TableCell>
                          <Box 
                            component="img"
                            src={product.image_url || '/placeholder/Image-not-found.png'}
                            alt={product.name}
                            sx={{
                              width: { xs: 50, md: 60 },
                              height: { xs: 50, md: 60 },
                              objectFit: 'cover',
                              borderRadius: 1,
                              border: '1px solid #e0e0e0'
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder/Image-not-found.png';
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                              {product.name}
                            </Typography>
                            {product.description && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  display: { xs: 'none', sm: 'block' },
                                  fontSize: '0.75rem'
                                }}
                              >
                                {product.description.substring(0, 40)}
                                {product.description.length > 40 ? '...' : ''}
                              </Typography>
                            )}
                            {/* Show prescription status on mobile */}
                            <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 0.5 }}>
                              {product.requires_prescription && (
                                <Chip
                                  label="Rx Required"
                                  color="secondary"
                                  size="small"
                                  sx={{ fontSize: '0.7rem', height: 20 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                            {product.category_name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                              {formatCurrency(product.price)}
                            </Typography>
                            {isBranchManager && (
                              <IconButton
                                size="small"
                                onClick={() => handlePriceDialogOpen(product)}
                                color="primary"
                                sx={{ p: 0.25, display: { xs: 'none', sm: 'inline-flex' } }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: { xs: '0.8rem', md: '0.875rem' },
                                fontWeight: product.stock_quantity <= 10 ? 600 : 400,
                                color: product.stock_quantity <= 10 ? 'warning.main' : 'text.primary'
                              }}
                            >
                              {product.stock_quantity}
                            </Typography>
                            {product.stock_quantity <= 10 && (
                              <WarningIcon color="warning" sx={{ fontSize: { xs: 16, md: 20 } }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStockStatus(product.stock_quantity).label}
                            color={getStockStatus(product.stock_quantity).color}
                            size="small"
                            sx={{ 
                              fontSize: { xs: '0.7rem', md: '0.75rem' },
                              height: { xs: 24, md: 32 }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Chip
                            label={product.requires_prescription ? 'Required' : 'Not Required'}
                            color={product.requires_prescription ? 'secondary' : 'default'}
                            size="small"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        {(isBranchManager || canEditStock) && (
                          <TableCell>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 0.5,
                              flexDirection: { xs: 'column', sm: 'row' },
                              alignItems: { xs: 'flex-start', sm: 'center' }
                            }}>
                              {canEditStock && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<InventoryIcon />}
                                  onClick={() => handleStockDialogOpen(product)}
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: { xs: 0.5, sm: 1 },
                                    fontSize: { xs: '0.7rem', md: '0.75rem' }
                                  }}
                                >
                                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Add Stock</Box>
                                  <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Stock</Box>
                                </Button>
                              )}
                              {isBranchManager && (
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDialogOpen(product)}
                                    color="primary"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteProduct(product.id)}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Add/Edit Product Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleDialogClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Product Name */}
            <TextField
              required
              fullWidth
              id="name"
              label="Product Name"
              name="name"
              autoFocus
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
            />
            
            {/* Category */}
            <FormControl fullWidth required>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                id="category_id"
                name="category_id"
                value={formData.category_id}
                label="Category"
                onChange={handleInputChange}
              >
                <MenuItem value="">
                  <em>Select a category</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Description */}
            <TextField
              fullWidth
              id="description"
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
            />

            {/* Price */}
            <TextField
              required
              fullWidth
              id="price"
              label="Price (USD)"
              name="price"
              type="number"
              step="0.01"
              inputProps={{ min: 0.01 }}
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              InputProps={{
                startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
              }}
            />
            
            {/* Stock Quantity */}
            <TextField
              required
              fullWidth
              id="stock_quantity"
              label="Stock Quantity"
              name="stock_quantity"
              type="number"
              inputProps={{ min: 0 }}
              value={formData.stock_quantity}
              onChange={handleInputChange}
              placeholder="0"
            />

            {/* Product Image Upload */}
            <Box>
              <Typography variant="body1" gutterBottom sx={{ fontWeight: 500 }}>
                Product Image (optional)
              </Typography>
              <Box sx={{ 
                border: '2px dashed #e0e0e0', 
                borderRadius: 2, 
                p: 3, 
                textAlign: 'center',
                bgcolor: '#fafafa'
              }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleFileSelect}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<AddIcon />}
                    disabled={uploadingImage}
                    fullWidth
                  >
                    {uploadingImage ? 'Uploading...' : 'Select Image'}
                  </Button>
                </label>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Max file size: 5MB (JPEG, PNG, GIF, WebP)
                </Typography>
                
                {selectedFile && (
                  <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 500 }}>
                    ✓ Selected: {selectedFile.name}
                  </Typography>
                )}
              </Box>
              
              {/* Image Preview */}
              {imagePreview && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" gutterBottom fontWeight={500}>
                    Preview:
                  </Typography>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview"
                    sx={{
                      width: '100%',
                      maxWidth: 200,
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 2,
                      border: '1px solid #e0e0e0'
                    }}
                  />
                </Box>
              )}
              
              {/* Current Image */}
              {!selectedFile && editingProduct?.image_url && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" gutterBottom fontWeight={500}>
                    Current Image:
                  </Typography>
                  <Box
                    component="img"
                    src={editingProduct.image_url}
                    alt="Current"
                    sx={{
                      width: '100%',
                      maxWidth: 200,
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 2,
                      border: '1px solid #e0e0e0'
                    }}
                    onError={(e) => {
                      e.target.src = '/placeholder/Image-not-found.png';
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Requires Prescription */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requires_prescription}
                  onChange={handleInputChange}
                  name="requires_prescription"
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Requires Prescription
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check this if the product requires a prescription to purchase
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={handleDialogClose} size="large">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={formLoading}
            size="large"
            sx={{ minWidth: 140 }}
          >
            {formLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                {editingProduct ? 'Updating...' : 'Creating...'}
              </Box>
            ) : (
              editingProduct ? 'Update Product' : 'Create Product'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog 
        open={openStockDialog} 
        onClose={handleStockDialogClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Add Stock
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {stockProduct && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {stockProduct.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Stock: {stockProduct.stock_quantity} units
                </Typography>
              </Box>
            )}
            
            <TextField
              autoFocus
              required
              fullWidth
              id="stock_quantity"
              label="Quantity to Add"
              name="stock_quantity"
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="Enter quantity to add"
              helperText="Enter the number of units to add to current stock"
              inputProps={{ min: 1 }}
            />
            
            {stockQuantity && stockProduct && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'primary.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                  New total stock: {stockProduct.stock_quantity + parseInt(stockQuantity || 0)} units
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleStockDialogClose} size="large">
            Cancel
          </Button>
          <Button 
            onClick={handleStockUpdate} 
            variant="contained"
            size="large"
            disabled={!stockQuantity || stockQuantity <= 0}
          >
            Add Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog 
        open={openPriceDialog} 
        onClose={handlePriceDialogClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Edit Price
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {priceProduct && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {priceProduct.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Price: {formatCurrency(priceProduct.price)}
                </Typography>
              </Box>
            )}
            
            <TextField
              autoFocus
              required
              fullWidth
              id="new_price"
              label="New Price (USD)"
              name="new_price"
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              helperText="Enter the new price in USD"
              inputProps={{ min: 0.01 }}
              InputProps={{
                startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
              }}
            />
            
            {newPrice && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'primary.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}>
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                  New price: {formatCurrency(parseFloat(newPrice) || 0)}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handlePriceDialogClose} size="large">
            Cancel
          </Button>
          <Button 
            onClick={handlePriceUpdate} 
            variant="contained"
            size="large"
            disabled={!newPrice || newPrice <= 0}
          >
            Update Price
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={handleDeleteDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: 'error.main' }}>
            Confirm Delete
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to delete this product?
            </Typography>
            {deletingProduct && (
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {deletingProduct.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Category: {deletingProduct.category}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stock: {deletingProduct.stock_quantity} units
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 500 }}>
              This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleDeleteDialogClose} size="large">
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteProduct}
            variant="contained"
            color="error"
            size="large"
            sx={{ minWidth: 100 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Warehouse;
