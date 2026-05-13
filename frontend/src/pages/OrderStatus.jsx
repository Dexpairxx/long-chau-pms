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
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  LocalPharmacy as PharmacyIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  AccessTime as ClockIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const OrderStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload prescription dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Order details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Expanded rows for order items
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    fetchOrders();
    
    // Check for new order from navigation state
    if (location.state?.newOrderId) {
      setSuccess(`Order created successfully!`);
      setTimeout(() => setSuccess(''), 5000);
    }
  }, [location.state]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/my-orders');
      setOrders(response.data.orders || []);
      setError('');
    } catch (error) {
      console.error('Fetch orders error:', error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'prescription_pending': return 'info';
      case 'prescription_approved': return 'success';
      case 'prescription_rejected': return 'error';
      case 'payment_pending': return 'primary';
      case 'paid': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'prescription_pending': return 'Prescription Pending';
      case 'prescription_approved': return 'Prescription Approved';
      case 'prescription_rejected': return 'Prescription Rejected';
      case 'payment_pending': return 'Payment Pending';
      case 'paid': return 'Paid';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleUploadPrescription = (orderId) => {
    setSelectedOrderId(orderId);
    setUploadDialogOpen(true);
    setUploadFiles([]);
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setUploadFiles(files);
  };

  const uploadPrescriptions = async () => {
    if (uploadFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploadLoading(true);
    setError('');

    try {
      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('prescriptions', file);
      });

      await axios.post(`/api/prescriptions/upload/${selectedOrderId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Prescriptions uploaded successfully!');
      setUploadDialogOpen(false);
      setUploadFiles([]);
      fetchOrders(); // Refresh orders
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Failed to upload prescriptions');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUploadLoading(false);
    }
  };

  const viewOrderDetails = async (orderId) => {
    setDetailsLoading(true);
    setSelectedOrderDetails(null);
    setDetailsDialogOpen(true);

    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setSelectedOrderDetails(response.data);
    } catch (error) {
      console.error('Fetch order details error:', error);
      setError('Failed to fetch order details');
      setDetailsDialogOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const downloadPrescription = async (prescriptionId, fileName) => {
    try {
      const response = await axios.get(`/api/prescriptions/download/${prescriptionId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download prescription');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deletePrescription = async (prescriptionId) => {
    try {
      await axios.delete(`/api/prescriptions/${prescriptionId}`);
      setSuccess('Prescription deleted successfully');
      
      // Refresh order details if dialog is open
      if (selectedOrderDetails) {
        await viewOrderDetails(selectedOrderDetails.order.id);
        
        // Check if order status needs to be updated
        const updatedOrderDetails = await axios.get(`/api/orders/${selectedOrderDetails.order.id}`);
        const orderData = updatedOrderDetails.data;
        
        // Check if any items require prescription
        const hasItemsRequiringPrescription = orderData.items.some(item => item.requires_prescription);
        
        // If no items require prescription or no prescriptions left
        if (!hasItemsRequiringPrescription || orderData.prescriptions.length === 0) {
          // Update order status based on whether items require prescription
          let newStatus;
          if (!hasItemsRequiringPrescription) {
            // If no items require prescription, move to payment pending
            newStatus = 'payment_pending';
          } else if (orderData.prescriptions.length === 0) {
            // If items require prescription but no prescriptions left, back to pending (waiting for pharmacist validation)
            newStatus = 'pending';
          }
          
          if (newStatus && newStatus !== orderData.order.status) {
            try {
              await axios.put(`/api/orders/${selectedOrderDetails.order.id}/status`, {
                status: newStatus
              });
              // Refresh the order details again to show updated status
              await viewOrderDetails(selectedOrderDetails.order.id);
            } catch (statusError) {
              console.error('Failed to update order status:', statusError);
            }
          }
        }
      }
      
      // Refresh orders list
      fetchOrders();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Delete prescription error:', error);
      setError(error.response?.data?.message || 'Failed to delete prescription');
      setTimeout(() => setError(''), 5000);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await axios.delete(`/api/orders/${orderId}`);
      setSuccess('Order deleted successfully');
      
      // Close details dialog if it's open for this order
      if (selectedOrderDetails && selectedOrderDetails.order.id === orderId) {
        setDetailsDialogOpen(false);
        setSelectedOrderDetails(null);
      }
      
      // Refresh orders list
      fetchOrders();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Delete order error:', error);
      setError(error.response?.data?.message || 'Failed to delete order');
      setTimeout(() => setError(''), 5000);
    }
  };

  const toggleRowExpanded = (orderId) => {
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  if (user?.role !== 'customer') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only customers can view order status.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track and manage your orders
        </Typography>

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Orders Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You haven't placed any orders yet.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/home')}
              >
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <TableContainer component={Paper} elevation={0} sx={{ minHeight: 500 }}>
                <Table size="medium" sx={{ '& .MuiTableCell-root': { padding: '12px 16px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: 50 }}></TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Items</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 220 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <React.Fragment key={order.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => toggleRowExpanded(order.id)}
                            >
                              {expandedRows[order.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {order.items_summary}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              ${parseFloat(order.total_amount).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusText(order.status)}
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                            {order.prescription_count > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                <Chip
                                  icon={<PharmacyIcon />}
                                  label={`${order.prescription_count} prescription(s)`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => viewOrderDetails(order.id)}
                              >
                                Details
                              </Button>
                              
                              {['pending', 'prescription_pending'].includes(order.status) && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<UploadIcon />}
                                  onClick={() => handleUploadPrescription(order.id)}
                                >
                                  Upload Rx
                                </Button>
                              )}
                              
                              {(order.status === 'prescription_approved' || order.status === 'payment_pending') && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  startIcon={<PaymentIcon />}
                                  onClick={() => navigate(`/payment/${order.id}`)}
                                >
                                  Pay Now
                                </Button>
                              )}
                              
                              {['pending', 'prescription_pending', 'payment_pending'].includes(order.status) && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<DeleteIcon />}
                                  onClick={() => deleteOrder(order.id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded row content */}
                        <TableRow>
                          <TableCell colSpan={7} sx={{ p: 0 }}>
                            <Collapse in={expandedRows[order.id]} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Order Summary
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="body2">
                                      <strong>Order Type:</strong> {order.order_type}
                                    </Typography>
                                    <Typography variant="body2">
                                      <strong>Created:</strong> {new Date(order.created_at).toLocaleString()}
                                    </Typography>
                                    {order.prescription_validated_at && (
                                      <Typography variant="body2">
                                        <strong>Validated:</strong> {new Date(order.prescription_validated_at).toLocaleString()}
                                      </Typography>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="body2">
                                      <strong>Items:</strong> {order.items_summary}
                                    </Typography>
                                    {order.prescription_notes && (
                                      <Typography variant="body2">
                                        <strong>Pharmacist Notes:</strong> {order.prescription_notes}
                                      </Typography>
                                    )}
                                  </Grid>
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
            </CardContent>
          </Card>
        )}

        {/* Enhanced Upload Prescription Dialog */}
        <Dialog 
          open={uploadDialogOpen} 
          onClose={() => setUploadDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { minHeight: '60vh' }
          }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.50', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <UploadIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Upload Prescription Files
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Order #{selectedOrderId}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                <strong>📋 Prescription Upload Requirements:</strong>
              </Typography>
              <Typography component="div" variant="body2">
                • Upload clear images or PDF files of your prescription(s)<br/>
                • Ensure all text is readable and legible<br/>
                • Maximum file size: 10MB per file<br/>
                • Accepted formats: JPG, PNG, PDF<br/>
                • Multiple files allowed for multiple prescriptions
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Files
              </Typography>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                style={{ 
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  backgroundColor: '#f9f9f9',
                  fontSize: '16px'
                }}
              />
            </Box>
            
            {uploadFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Selected Files ({uploadFiles.length})
                </Typography>
                <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
                  {uploadFiles.map((file, index) => (
                    <ListItem key={index} sx={{ bgcolor: 'white', mb: 1, borderRadius: 1 }}>
                      <ListItemIcon>
                        <AttachmentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body1" fontWeight="bold">{file.name}</Typography>}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Type: {file.type || 'Unknown'}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip 
                        size="small" 
                        color="success" 
                        variant="outlined" 
                        label="Ready"
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {uploadFiles.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1 }}>
                <UploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No files selected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please select your prescription files to upload
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={() => setUploadDialogOpen(false)} size="large">
              Cancel
            </Button>
            <Button
              onClick={uploadPrescriptions}
              variant="contained"
              size="large"
              disabled={uploadLoading || uploadFiles.length === 0}
              startIcon={uploadLoading ? <CircularProgress size={20} /> : <UploadIcon />}
              sx={{ minWidth: 140 }}
            >
              {uploadLoading ? 'Uploading...' : `Upload ${uploadFiles.length} File${uploadFiles.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog
          open={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Order Details
          </DialogTitle>
          <DialogContent>
            {detailsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : selectedOrderDetails ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Order Information */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Order Information
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Status:</strong> {getStatusText(selectedOrderDetails.order.status)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Total Amount:</strong> ${parseFloat(selectedOrderDetails.order.total_amount).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Created:</strong> {new Date(selectedOrderDetails.order.created_at).toLocaleString()}
                  </Typography>
                  {selectedOrderDetails.order.prescription_validated_at && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Validated:</strong> {new Date(selectedOrderDetails.order.prescription_validated_at).toLocaleString()}
                    </Typography>
                  )}
                  {selectedOrderDetails.order.prescription_notes && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Pharmacist Notes:</strong> {selectedOrderDetails.order.prescription_notes}
                    </Typography>
                  )}
                </Box>

                {/* Order Items */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Items Ordered
                  </Typography>
                  <List dense>
                    {selectedOrderDetails.items.map((item) => (
                      <ListItem key={item.id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={`${item.quantity}x ${item.product_name}`}
                          secondary={`$${parseFloat(item.unit_price).toFixed(2)} each = $${parseFloat(item.total_price).toFixed(2)}`}
                        />
                        {item.requires_prescription ? (
                          <Chip
                            icon={<PharmacyIcon />}
                            label="Prescription Required"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="No Prescription Needed"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* Prescriptions */}
                {selectedOrderDetails.prescriptions.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Uploaded Prescriptions
                    </Typography>
                    <List>
                      {selectedOrderDetails.prescriptions.map((prescription) => (
                        <ListItem key={prescription.id} sx={{ px: 0 }}>
                          <ListItemIcon>
                            <AttachmentIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={prescription.file_name}
                            secondary={`Uploaded: ${new Date(prescription.uploaded_at).toLocaleString()}`}
                          />
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={() => downloadPrescription(prescription.id, prescription.file_name)}
                            >
                              Download
                            </Button>
                            {['pending', 'prescription_pending'].includes(selectedOrderDetails.order.status) && (
                              <Button
                                size="small"
                                color="error"
                                startIcon={<CancelIcon />}
                                onClick={() => deletePrescription(prescription.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default OrderStatus;
