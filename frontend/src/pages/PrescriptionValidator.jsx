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
  TextField,
  Collapse,
  IconButton
} from '@mui/material';
import {
  LocalPharmacy as PharmacyIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Attachment as AttachmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccessTime as ClockIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PrescriptionValidator = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Validation dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [validationAction, setValidationAction] = useState('');
  const [validationNotes, setValidationNotes] = useState('');
  const [validationLoading, setValidationLoading] = useState(false);
  
  // Order details dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailsLoadingState, setDetailsLoadingState] = useState(false);
  
  // Order details state
  const [expandedRows, setExpandedRows] = useState({});
  const [orderDetails, setOrderDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});

  useEffect(() => {
    if (user?.role === 'pharmacist') {
      fetchPendingOrders();
    }
  }, [user]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/pending-validation');
      setOrders(response.data.orders || []);
      setError('');
    } catch (error) {
      console.error('Fetch pending orders error:', error);
      setError('Failed to fetch pending orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId) => {
    if (orderDetails[orderId]) return; // Already loaded

    setDetailsLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrderDetails(prev => ({
        ...prev,
        [orderId]: response.data
      }));
    } catch (error) {
      console.error('Load order details error:', error);
      setError('Failed to load order details');
    } finally {
      setDetailsLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleRowExpanded = async (orderId) => {
    const isExpanding = !expandedRows[orderId];
    
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: isExpanding
    }));

    if (isExpanding) {
      await loadOrderDetails(orderId);
    }
  };

  const handleValidation = (order, action) => {
    setSelectedOrder(order);
    setValidationAction(action);
    setValidationNotes('');
    setValidationDialogOpen(true);
  };

  const submitValidation = async () => {
    if (!selectedOrder || !validationAction) return;

    setValidationLoading(true);
    setError('');

    try {
      await axios.post(`/api/orders/validate/${selectedOrder.id}`, {
        action: validationAction,
        notes: validationNotes
      });

      setSuccess(`Prescription ${validationAction}d successfully for Order #${selectedOrder.id}`);
      setValidationDialogOpen(false);
      setSelectedOrder(null);
      setValidationAction('');
      setValidationNotes('');
      
      // Refresh orders list
      fetchPendingOrders();
      
      setTimeout(() => setSuccess(''), 5000);

    } catch (error) {
      console.error('Validation error:', error);
      setError(error.response?.data?.message || 'Failed to validate prescription');
      setTimeout(() => setError(''), 5000);
    } finally {
      setValidationLoading(false);
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

  const handleViewDetails = async (order) => {
    setSelectedOrderDetails(null);
    setDetailsDialogOpen(true);
    setDetailsLoadingState(true);

    try {
      const response = await axios.get(`/api/orders/${order.id}`);
      setSelectedOrderDetails({
        order: order,
        details: response.data
      });
    } catch (error) {
      console.error('Load order details error:', error);
      setError('Failed to load order details');
    } finally {
      setDetailsLoadingState(false);
    }
  };

  if (user?.role !== 'pharmacist') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only pharmacists can access prescription validation.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PharmacyIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Prescription Validator
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Review and validate customer prescriptions
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
          <Alert severity="success" sx={{ mb: 2 }}>
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
              <PharmacyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Pending Validations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All prescriptions have been processed.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Orders Pending Prescription Validation ({orders.length})
              </Typography>
              
              <TableContainer component={Paper} elevation={0} sx={{ minHeight: 600, maxHeight: 800, overflow: 'auto' }}>
                <Table stickyHeader size="medium" sx={{ '& .MuiTableCell-root': { padding: '12px 16px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: 60, position: 'sticky', left: 0, zIndex: 1201, backgroundColor: 'background.paper' }}></TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Order ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 250 }}>Items</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 130 }}>Prescriptions</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Total</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 300 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                      <TableBody>
                        {orders.map((order) => (
                          <React.Fragment key={order.id}>
                            <TableRow>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleRowExpanded(order.id)}
                                >
                                  {expandedRows[order.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  #{order.id}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {order.customer_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {order.customer_email}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <ClockIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2">
                                    {new Date(order.created_at).toLocaleDateString()}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {order.items_summary}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={<AttachmentIcon />}
                                  label={`${order.prescription_count} file(s)`}
                                  size="small"
                                  color={order.prescription_count > 0 ? 'primary' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  ${parseFloat(order.total_amount).toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ViewIcon />}
                                    onClick={() => handleViewDetails(order)}
                                    sx={{ mb: 0.5 }}
                                  >
                                    Details
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<ApproveIcon />}
                                    onClick={() => handleValidation(order, 'approve')}
                                    disabled={order.prescription_count === 0}
                                    sx={{ mb: 0.5 }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="error"
                                    startIcon={<RejectIcon />}
                                    onClick={() => handleValidation(order, 'reject')}
                                    sx={{ mb: 0.5 }}
                                  >
                                    Reject
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>                        {/* Expanded row content */}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ p: 0 }}>
                            <Collapse in={expandedRows[order.id]} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                                {detailsLoading[order.id] ? (
                                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                    <CircularProgress size={24} />
                                  </Box>
                                ) : orderDetails[order.id] ? (
                                  <Grid container spacing={3}>
                                    {/* Order Items */}
                                    <Grid item xs={12} md={6}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Order Items
                                      </Typography>
                                      <List dense>
                                        {orderDetails[order.id].items.map((item) => (
                                          <ListItem key={item.id} sx={{ py: 0.5 }}>
                                            <ListItemText
                                              primary={`${item.quantity}x ${item.product_name}`}
                                              secondary={`$${parseFloat(item.unit_price).toFixed(2)} each = $${parseFloat(item.total_price).toFixed(2)}`}
                                            />
                                            {item.requires_prescription && (
                                              <Chip
                                                icon={<PharmacyIcon />}
                                                label="Rx Required"
                                                size="small"
                                                color="warning"
                                                variant="outlined"
                                              />
                                            )}
                                          </ListItem>
                                        ))}
                                      </List>
                                    </Grid>

                                    {/* Prescriptions */}
                                    <Grid item xs={12} md={6}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Uploaded Prescriptions ({orderDetails[order.id].prescriptions.length})
                                      </Typography>
                                      {orderDetails[order.id].prescriptions.length > 0 ? (
                                        <List dense>
                                          {orderDetails[order.id].prescriptions.map((prescription) => (
                                            <ListItem key={prescription.id} sx={{ py: 0.5 }}>
                                              <ListItemIcon>
                                                <AttachmentIcon fontSize="small" />
                                              </ListItemIcon>
                                              <ListItemText
                                                primary={prescription.file_name}
                                                secondary={`Uploaded: ${new Date(prescription.uploaded_at).toLocaleString()}`}
                                              />
                                              <Button
                                                size="small"
                                                startIcon={<DownloadIcon />}
                                                onClick={() => downloadPrescription(prescription.id, prescription.file_name)}
                                              >
                                                View
                                              </Button>
                                            </ListItem>
                                          ))}
                                        </List>
                                      ) : (
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                          No prescriptions uploaded yet
                                        </Typography>
                                      )}
                                    </Grid>
                                  </Grid>
                                ) : null}
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

        {/* Validation Dialog */}
        <Dialog 
          open={validationDialogOpen} 
          onClose={() => setValidationDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {validationAction === 'approve' ? 'Approve' : 'Reject'} Prescription - Order #{selectedOrder?.id}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You are about to {validationAction} the prescription for Order #{selectedOrder?.id} 
              from {selectedOrder?.customer_name}.
            </Typography>
            
            <TextField
              label={`${validationAction === 'approve' ? 'Approval' : 'Rejection'} Notes`}
              placeholder={`Enter ${validationAction === 'approve' ? 'approval notes (optional)' : 'reason for rejection'}`}
              multiline
              rows={4}
              fullWidth
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setValidationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitValidation}
              variant="contained"
              color={validationAction === 'approve' ? 'success' : 'error'}
              disabled={validationLoading}
              startIcon={validationLoading ? <CircularProgress size={20} /> : 
                (validationAction === 'approve' ? <ApproveIcon /> : <RejectIcon />)}
            >
              {validationLoading ? 'Processing...' : 
                (validationAction === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Order Details Dialog - Enhanced */}
        <Dialog 
          open={detailsDialogOpen} 
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { minHeight: '80vh', maxHeight: '90vh' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PharmacyIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    Order Details - #{selectedOrderDetails?.order.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prescription Validation Required
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  icon={<AttachmentIcon />}
                  label={`${selectedOrderDetails?.order.prescription_count || 0} prescription(s)`}
                  color="primary"
                  size="small"
                />
                <Chip
                  label={`$${parseFloat(selectedOrderDetails?.order.total_amount || 0).toFixed(2)}`}
                  color="success"
                  size="small"
                />
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {detailsLoadingState ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={60} />
                <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                  Loading order details...
                </Typography>
              </Box>
            ) : selectedOrderDetails ? (
              <Grid container spacing={3}>
                {/* Customer Information - Enhanced */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                        <PersonIcon sx={{ mr: 1 }} />
                        Customer Information
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" color="text.secondary">Full Name:</Typography>
                          <Typography variant="body1" fontWeight="bold">{selectedOrderDetails.order.customer_name}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" color="text.secondary">Email:</Typography>
                          <Typography variant="body1">{selectedOrderDetails.order.customer_email}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" color="text.secondary">Order Date:</Typography>
                          <Typography variant="body1">{new Date(selectedOrderDetails.order.created_at).toLocaleString()}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" color="text.secondary">Order Type:</Typography>
                          <Chip 
                            label={selectedOrderDetails.order.order_type || 'online'} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Order Items - Enhanced */}
                <Grid item xs={12} md={7}>
                  <Card variant="outlined" sx={{ height: 'fit-content' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                        <ReceiptIcon sx={{ mr: 1 }} />
                        Order Items ({selectedOrderDetails.details.items?.length || 0})
                      </Typography>
                      <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                        {selectedOrderDetails.details.items?.map((item, index) => (
                          <Card key={item.id} variant="outlined" sx={{ mb: 1, p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body1" fontWeight="bold" sx={{ mr: 1 }}>
                                    {index + 1}. {item.product_name}
                                  </Typography>
                                  {item.requires_prescription && (
                                    <Chip
                                      icon={<PharmacyIcon />}
                                      label="Prescription Required"
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  Quantity: <strong>{item.quantity}</strong> | 
                                  Unit Price: <strong>${parseFloat(item.unit_price).toFixed(2)}</strong>
                                </Typography>
                                <Typography variant="body1" color="primary.main" fontWeight="bold">
                                  Subtotal: ${parseFloat(item.total_price).toFixed(2)}
                                </Typography>
                              </Box>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                      
                      {/* Order Summary */}
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" color="primary.main" textAlign="right">
                          Total: ${parseFloat(selectedOrderDetails.order.total_amount).toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Uploaded Prescriptions - Enhanced */}
                <Grid item xs={12} md={5}>
                  <Card variant="outlined" sx={{ height: 'fit-content' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                        <AttachmentIcon sx={{ mr: 1 }} />
                        Prescription Files ({selectedOrderDetails.details.prescriptions?.length || 0})
                      </Typography>
                      {selectedOrderDetails.details.prescriptions?.length > 0 ? (
                        <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
                          {selectedOrderDetails.details.prescriptions.map((prescription, index) => (
                            <Card key={prescription.id} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: 'grey.50' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AttachmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="body1" fontWeight="bold">
                                  File #{index + 1}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-word' }}>
                                <strong>Name:</strong> {prescription.file_name}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Size:</strong> {prescription.file_size ? `${(prescription.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 2 }}>
                                <strong>Uploaded:</strong> {new Date(prescription.uploaded_at).toLocaleString()}
                              </Typography>
                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={() => downloadPrescription(prescription.id, prescription.file_name)}
                                sx={{ mb: 1 }}
                              >
                                View/Download File
                              </Button>
                            </Card>
                          ))}
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <AttachmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            No Prescriptions Uploaded
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Customer needs to upload prescription files before validation can proceed.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            {selectedOrderDetails && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ApproveIcon />}
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    handleValidation(selectedOrderDetails.order, 'approve');
                  }}
                  disabled={selectedOrderDetails.order.prescription_count === 0}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    handleValidation(selectedOrderDetails.order, 'reject');
                  }}
                >
                  Reject
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default PrescriptionValidator;
