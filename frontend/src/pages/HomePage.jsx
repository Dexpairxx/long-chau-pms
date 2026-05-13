import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  Button,
  CardMedia,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  InputAdornment,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ProductDetailModal from '../components/ProductDetailModal';
import axios from 'axios';

const HomePage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // TypeWriter effect
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const fullText = "Your Health, Our Priority";

  // Cart states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // TypeWriter effect
  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, fullText]);

  // Fetch products and categories
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch products');
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories/all');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.price - b.price;
      case 'price_high':
        return b.price - a.price;
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + productsPerPage);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleAddToCart = (product) => {
    if (user?.role !== 'customer') {
      return; // Only customers can add to cart
    }
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  // Check if user is customer
  const isCustomer = user?.role === 'customer';

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section - Full Screen */}
      <Box
        sx={{
          height: '100vh',
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("/background.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Container maxWidth="lg" sx={{ zIndex: 2 }}>
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            FPT Long Chau Pharmacy
          </Typography>
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            sx={{
              minHeight: '1.5em',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              fontWeight: 500,
              mb: 3,
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {displayText}
            <Box component="span" sx={{ animation: 'blink 1s infinite' }}>|</Box>
          </Typography>
          <Typography
            variant="h5"
            sx={{
              mb: 4,
              opacity: 0.95,
              fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
              fontWeight: 400,
              maxWidth: '800px',
              mx: 'auto',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            Trusted Healthcare Partner - Quality Medications & Professional Service Since 1995
          </Typography>

          <Button
            variant="contained"
            size="large"
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255,255,255,0.95)',
              color: 'primary.main',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'white',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 25px rgba(0,0,0,0.4)'
              },
              transition: 'all 0.3s ease'
            }}
            onClick={() => {
              document.getElementById('products').scrollIntoView({
                behavior: 'smooth'
              });
            }}
          >
            Explore Our Products
          </Button>
        </Container>

        {/* Scroll indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            opacity: 0.7,
            animation: 'bounce 2s infinite'
          }}
        >
          {/* <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
            Scroll to explore
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            ↓
          </Box> */}
        </Box>
      </Box>

      {/* Products Section */}
      <Box sx={{ paddingTop: '64px' }}> {/* Offset for fixed navbar */}
        <Container maxWidth="lg" sx={{ py: 6 }} id="products">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h3"
              component="h2"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                mb: 2,
                mt: 5
              }}
            >
              Our Products
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: '600px',
                mx: 'auto',
                fontWeight: 400
              }}
            >
              Discover our comprehensive range of quality medications and health products
            </Typography>

            {/* Error Messages */}
            {error && (
              <Alert severity="error" sx={{ mt: 3, maxWidth: '600px', mx: 'auto' }}>
                {error}
              </Alert>
            )}
          </Box>

          {/* Advanced Search and Filter Section */}
          <Box sx={{ mb: 6 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                overflow: 'visible'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {/* Main Search Bar */}
                <Box sx={{ mb: 4 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="What are you looking for today?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'action.active' }} />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 3,
                        backgroundColor: 'grey.50',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'transparent'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                          borderWidth: 2
                        },
                        fontSize: '1rem',
                        py: 1
                      }
                    }}
                  />
                </Box>

                {/* Filter Options */}
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth sx={{ minWidth: 150 }}>
                      <InputLabel sx={{ backgroundColor: 'background.paper', px: 1, minWidth: 80 }}>
                        Category
                      </InputLabel>
                      <Select
                        value={selectedCategory}
                        label="Category"
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        sx={{
                          borderRadius: 2,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'divider'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {category.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ backgroundColor: 'background.paper', px: 1 }}>
                        Sort By
                      </InputLabel>
                      <Select
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                        sx={{
                          borderRadius: 2,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'divider'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          }
                        }}
                      >
                        <MenuItem value="name">Name A-Z</MenuItem>
                        <MenuItem value="price_low">Price: Low to High</MenuItem>
                        <MenuItem value="price_high">Price: High to Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
                      <Button
                        variant="outlined"
                        startIcon={<FilterIcon />}
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('');
                          setSortBy('name');
                          setCurrentPage(1);
                        }}
                        sx={{
                          borderRadius: 2,
                          borderColor: 'divider',
                          color: 'text.secondary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'primary.50'
                          },
                          flex: 1,
                          py: 1.5
                        }}
                      >
                        Clear Filters
                      </Button>
                    </Box>
                  </Grid>
                </Grid>

                {/* Results Summary */}
                <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Loading...' : `Showing ${paginatedProducts.length} of ${sortedProducts.length} products`}
                    {searchTerm && ` for "${searchTerm}"`}
                    {selectedCategory && categories.find(c => c.id === selectedCategory) &&
                      ` in ${categories.find(c => c.id === selectedCategory).name}`
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Products Grid */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={{ xs: 2, sm: 3 }} justifyContent="center">
                {paginatedProducts.map((product) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                    <Card sx={{
                      height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: 6
                      }
                    }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={product.image_url || 'placeholder/Image-not-found.png'}
                        alt={product.name}
                        onError={(e) => {
                          e.target.src = 'placeholder/Image-not-found.png';
                        }}
                      />
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} width={300}>
                          {product.description?.substring(0, 80)}
                          {product.description?.length > 80 ? '...' : ''}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(product.price)}
                          </Typography>
                        </Box>
                        {product.requires_prescription ? (
                          <Chip
                            label="Prescription Required"
                            color="warning"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          <Chip
                            label="No Prescription Needed"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>
                      <CardActions>
                        {isCustomer && (
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<ShoppingCartIcon />}
                            onClick={() => handleAddToCart(product)}
                          >
                            Add to Cart
                          </Button>
                        )}
                        {!isCustomer && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              width: '100%',
                              textAlign: 'center',
                              py: 1,
                              fontStyle: 'italic'
                            }}
                          >
                            Login as customer to purchase
                          </Typography>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(event, value) => setCurrentPage(value)}
                    color="primary"
                    size="large"
                  />
                </Box>
              )}

              {paginatedProducts.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No products found matching your criteria
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Try adjusting your search or filter options
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Container>
      </Box> {/* Close products section wrapper */}

      {/* CSS for animations */}
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0) translateX(-50%);
            }
            40% {
              transform: translateY(-10px) translateX(-50%);
            }
            60% {
              transform: translateY(-5px) translateX(-50%);
            }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .fade-in-up {
            animation: fadeInUp 0.6s ease-out;
          }
        `}
      </style>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={modalOpen}
        onClose={handleCloseModal}
      />
    </Box>
  );
};

export default HomePage;
