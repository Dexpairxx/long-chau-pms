import React, { useState, useEffect } from 'react';
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
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
  TextField
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const OrderManagement = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.role === 'cashier' || user?.role === 'branch_manager') {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/all');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'prescription_pending': 'info',
      'prescription_approved': 'success',
      'prescription_rejected': 'error',
      'payment_pending': 'warning',
      'paid': 'info',
      'completed': 'success',
      'cancelled': 'error'
    };
    return colors[status] || 'default';
  };

  const getOrderTypeColor = (type) => {
    return type === 'in_store' ? 'secondary' : 'primary';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-AU');
  };

  const getCustomerName = (order) => {
    if (order.order_type === 'in_store') {
      return order.customer_name || 'Walk-in Customer';
    }
    return order.customer_full_name || 'Unknown Customer';
  };

  const getCustomerInfo = (order) => {
    if (order.order_type === 'in_store') {
      return {
        name: order.customer_name || 'Walk-in Customer',
        email: order.customer_email || 'N/A',
        phone: order.customer_phone || 'N/A'
      };
    }
    return {
      name: order.customer_full_name || 'Unknown Customer',
      email: order.customer_email || 'N/A',
      phone: order.customer_phone || 'N/A'
    };
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const toggleRowExpansion = (orderId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.order_type === typeFilter;
    const matchesSearch = searchTerm === '' || 
      getCustomerName(order).toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toString().includes(searchTerm) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesType && matchesSearch;
  });

  if (user?.role !== 'cashier' && user?.role !== 'branch_manager') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only cashiers and branch managers can access order management.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Order Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                View and manage all orders in the system
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1 }} />
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order ID, customer name, email..."
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="prescription_pending">Prescription Pending</MenuItem>
                    <MenuItem value="prescription_approved">Prescription Approved</MenuItem>
                    <MenuItem value="prescription_rejected">Prescription Rejected</MenuItem>
                    <MenuItem value="payment_pending">Payment Pending</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Order Type</InputLabel>
                  <Select
                    value={typeFilter}
                    label="Order Type"
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="online">Online Orders</MenuItem>
                    <MenuItem value="in_store">In-Store Orders</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Showing {filteredOrders.length} of {orders.length} orders
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Orders List
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredOrders.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No orders found
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="40px"></TableCell>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Payment</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <React.Fragment key={order.id}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => toggleRowExpansion(order.id)}
                            >
                              {expandedRows.has(order.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              #{order.id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {getCustomerName(order)}
                            </Typography>
                            {order.order_type === 'in_store' && (
                              <Typography variant="caption" color="text.secondary">
                                Walk-in Customer
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.order_type === 'in_store' ? 'In-Store' : 'Online'}
                              color={getOrderTypeColor(order.order_type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status.replace('_', ' ').toUpperCase()}
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {formatCurrency(order.final_total || order.total_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {order.payment_method || 'N/A'}
                              </Typography>
                              <br />
                              <Chip
                                label={order.payment_status || 'pending'}
                                color={order.payment_status === 'completed' ? 'success' : 'warning'}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatDate(order.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(order)}
                              color="primary"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                            <Collapse in={expandedRows.has(order.id)} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Order Details
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Customer Information:
                                    </Typography>
                                    <Typography variant="body2">
                                      {getCustomerInfo(order).name}
                                    </Typography>
                                    <Typography variant="caption">
                                      {getCustomerInfo(order).email}
                                    </Typography>
                                    {getCustomerInfo(order).phone !== 'N/A' && (
                                      <Typography variant="caption" display="block">
                                        {getCustomerInfo(order).phone}
                                      </Typography>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Delivery Information:
                                    </Typography>
                                    <Typography variant="body2">
                                      Method: {order.delivery_method || 'N/A'}
                                    </Typography>
                                    {order.delivery_fee > 0 && (
                                      <Typography variant="caption">
                                        Fee: {formatCurrency(order.delivery_fee)}
                                      </Typography>
                                    )}
                                  </Grid>
                                  {order.notes && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">
                                        Notes:
                                      </Typography>
                                      <Typography variant="body2">
                                        {order.notes}
                                      </Typography>
                                    </Grid>
                                  )}
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Order Details - #{selectedOrder?.id}
          </DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Customer Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {getCustomerInfo(selectedOrder).name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Email:</strong> {getCustomerInfo(selectedOrder).email}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {getCustomerInfo(selectedOrder).phone}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Order Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>Type:</strong> {selectedOrder.order_type === 'in_store' ? 'In-Store' : 'Online'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {selectedOrder.status.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Payment:</strong> {selectedOrder.payment_method || 'N/A'} ({selectedOrder.payment_status})
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created:</strong> {formatDate(selectedOrder.created_at)}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Order Items
                </Typography>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name || item.name}</TableCell>
                            <TableCell align="center">{item.quantity}</TableCell>
                            <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No items found for this order.
                  </Typography>
                )}

                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Typography variant="h6">
                    Total: {formatCurrency(selectedOrder.final_total || selectedOrder.total_amount)}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default OrderManagement;
