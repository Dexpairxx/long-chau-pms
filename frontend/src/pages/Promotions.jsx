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
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Promotions = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Customer data
  const [customers, setCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Promotion data
  const [promotions, setPromotions] = useState([]);
  const [promotionTitle, setPromotionTitle] = useState('');
  const [promotionContent, setPromotionContent] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);

  useEffect(() => {
    if (user?.role === 'branch_manager') {
      fetchCustomers();
      fetchPromotions();
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/users/customers');
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers');
    }
  };

  const fetchPromotions = async () => {
    try {
      const response = await axios.get('/api/promotions');
      setPromotions(response.data.promotions || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setError('Failed to load promotion history');
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCustomers(customers.map(customer => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
      setSelectAll(false);
    }
  };

  const handleCreatePromotion = () => {
    if (!promotionTitle.trim()) {
      setError('Please enter a promotion title');
      return;
    }
    if (!promotionContent.trim()) {
      setError('Please enter promotion content');
      return;
    }
    if (selectedCustomers.length === 0) {
      setError('Please select at least one customer');
      return;
    }
    
    setCreateDialogOpen(true);
  };

  const confirmSendPromotion = async () => {
    try {
      setLoading(true);
      
      const promotionData = {
        title: promotionTitle,
        content: promotionContent,
        recipients: selectedCustomers
      };

      const response = await axios.post('/api/promotions/send', promotionData);
      
      setSuccess(`Promotion sent successfully to ${selectedCustomers.length} customers!`);
      setCreateDialogOpen(false);
      
      // Reset form
      setPromotionTitle('');
      setPromotionContent('');
      setSelectedCustomers([]);
      setSelectAll(false);
      
      // Refresh promotions
      fetchPromotions();
      
    } catch (error) {
      console.error('Error sending promotion:', error);
      setError(error.response?.data?.message || 'Failed to send promotion');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPromotion = (promotion) => {
    setSelectedPromotion(promotion);
    setPreviewDialogOpen(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-AU');
  };

  if (user?.role !== 'branch_manager') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only branch managers can access promotion management.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
          mb: 3 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 0 } }}>
            <EmailIcon sx={{ 
              fontSize: { xs: 32, md: 40 }, 
              mr: { xs: 1, md: 2 }, 
              color: 'primary.main' 
            }} />
            <Box>
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom
                sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}
              >
                Promotion Management
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
              >
                Create and send promotional emails to customers
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setHistoryDialogOpen(true)}
            fullWidth={isSmallScreen}
            sx={{ 
              minWidth: { xs: 'auto', sm: 140 },
              fontSize: { xs: '0.875rem', md: '0.875rem' }
            }}
          >
            View History
          </Button>
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

        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* Left Column - Create Promotion */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: { xs: '1.1rem', md: '1.25rem' }
                  }}
                >
                  <AddIcon sx={{ mr: 1 }} />
                  Create Promotion
                </Typography>
                
                <TextField
                  label="Promotion Title"
                  value={promotionTitle}
                  onChange={(e) => setPromotionTitle(e.target.value)}
                  fullWidth
                  margin="normal"
                  placeholder="e.g., Summer Sale - 20% Off All Vitamins"
                  size={isSmallScreen ? "small" : "medium"}
                />
                
                <TextField
                  label="Promotion Content"
                  value={promotionContent}
                  onChange={(e) => setPromotionContent(e.target.value)}
                  fullWidth
                  multiline
                  rows={isMobile ? 6 : 8}
                  margin="normal"
                  placeholder="Dear valued customer,&#10;&#10;We're excited to announce our Summer Sale! Get 20% off all vitamin and supplement products.&#10;&#10;Offer valid until the end of July.&#10;&#10;Visit us today!&#10;&#10;Best regards,&#10;Long Chau Pharmacy"
                  size={isSmallScreen ? "small" : "medium"}
                />

                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Selected Recipients: {selectedCustomers.length} of {customers.length} customers
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size={isSmallScreen ? "medium" : "large"}
                  startIcon={<SendIcon />}
                  onClick={handleCreatePromotion}
                  disabled={!promotionTitle.trim() || !promotionContent.trim() || selectedCustomers.length === 0}
                  sx={{ mt: 2 }}
                >
                  Send Promotion
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Customer Selection */}
          <Grid item xs={12} lg={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    fontSize: { xs: '1.1rem', md: '1.25rem' }
                  }}
                >
                  <PeopleIcon sx={{ mr: 1 }} />
                  Select Recipients ({customers.length} customers)
                </Typography>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      indeterminate={selectedCustomers.length > 0 && selectedCustomers.length < customers.length}
                    />
                  }
                  label="Select All Customers"
                  sx={{ mb: 2 }}
                />

                <TableContainer 
                  component={Paper} 
                  variant="outlined" 
                  sx={{ 
                    maxHeight: { xs: 300, md: 400 },
                    borderRadius: 2
                  }}
                >
                  <Table stickyHeader size={isSmallScreen ? "small" : "medium"}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox"></TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Joined</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedCustomers.includes(customer.id)}
                              onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography 
                                variant="body2" 
                                sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                              >
                                {customer.full_name}
                              </Typography>
                              {/* Show email on mobile */}
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  display: { xs: 'block', sm: 'none' },
                                  fontSize: '0.75rem'
                                }}
                              >
                                {customer.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                            >
                              {customer.email}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Typography variant="caption">
                              {formatDate(customer.created_at)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Create Promotion Confirmation Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={isSmallScreen}
          PaperProps={{
            sx: { borderRadius: isSmallScreen ? 0 : 2 }
          }}
        >
          <DialogTitle>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              Confirm Send Promotion
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {promotionTitle}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 2, 
                whiteSpace: 'pre-wrap',
                fontSize: { xs: '0.875rem', md: '0.875rem' }
              }}
            >
              {promotionContent}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              This promotion will be sent to {selectedCustomers.length} selected customers.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => setCreateDialogOpen(false)}
              size={isSmallScreen ? "medium" : "large"}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmSendPromotion} 
              variant="contained" 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              size={isSmallScreen ? "medium" : "large"}
            >
              {loading ? 'Sending...' : 'Send Promotion'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Promotion History Dialog */}
        <Dialog 
          open={historyDialogOpen} 
          onClose={() => setHistoryDialogOpen(false)} 
          maxWidth="lg" 
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: { borderRadius: isMobile ? 0 : 2 }
          }}
        >
          <DialogTitle>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              Promotion History
            </Typography>
          </DialogTitle>
          <DialogContent>
            {promotions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No promotions sent yet
              </Typography>
            ) : (
              <TableContainer 
                sx={{ 
                  borderRadius: 2,
                  border: '1px solid #e0e0e0'
                }}
              >
                <Table size={isSmallScreen ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Recipients</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Sent Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {promotions.map((promotion) => (
                      <TableRow key={promotion.id}>
                        <TableCell>
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'medium',
                                fontSize: { xs: '0.8rem', md: '0.875rem' }
                              }}
                            >
                              {promotion.title}
                            </Typography>
                            {/* Show status and recipient count on mobile */}
                            <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                              <Chip
                                label={promotion.status.toUpperCase()}
                                color={promotion.status === 'sent' ? 'success' : 'default'}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {promotion.recipient_count || 0} recipients
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          <Chip
                            label={promotion.status.toUpperCase()}
                            color={promotion.status === 'sent' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2">
                            {promotion.recipient_count || 0} customers
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="caption">
                            {promotion.sent_at ? formatDate(promotion.sent_at) : 'Not sent'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handlePreviewPromotion(promotion)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => setHistoryDialogOpen(false)}
              size={isSmallScreen ? "medium" : "large"}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Promotion Preview Dialog */}
        <Dialog 
          open={previewDialogOpen} 
          onClose={() => setPreviewDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={isSmallScreen}
          PaperProps={{
            sx: { borderRadius: isSmallScreen ? 0 : 2 }
          }}
        >
          <DialogTitle>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              Promotion Details
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedPromotion && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedPromotion.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 2, 
                    whiteSpace: 'pre-wrap',
                    fontSize: { xs: '0.875rem', md: '0.875rem' }
                  }}
                >
                  {selectedPromotion.content}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status:
                    </Typography>
                    <Typography variant="body2">
                      <Chip
                        label={selectedPromotion.status.toUpperCase()}
                        color={selectedPromotion.status === 'sent' ? 'success' : 'default'}
                        size="small"
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Recipients:
                    </Typography>
                    <Typography variant="body2">
                      {selectedPromotion.recipient_count || 0} customers
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Created:
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedPromotion.created_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Sent:
                    </Typography>
                    <Typography variant="body2">
                      {selectedPromotion.sent_at ? formatDate(selectedPromotion.sent_at) : 'Not sent'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => setPreviewDialogOpen(false)}
              size={isSmallScreen ? "medium" : "large"}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Promotions;
