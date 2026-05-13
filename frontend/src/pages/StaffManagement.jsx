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
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: '',
    phone: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Fetch only staff members using dedicated endpoint
  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/staff');
      setStaff(response.data.staff || []);
      setError('');
    } catch (error) {
      setError('Failed to fetch staff data');
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleDialogOpen = () => {
    setOpenDialog(true);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: '',
      phone: ''
    });
    setFormError('');
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setFormError('');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await axios.post('/api/users/staff', formData);
      await fetchStaff(); // Refresh the staff list
      handleDialogClose();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to create staff account');
    } finally {
      setFormLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'branch_manager':
        return 'error';
      case 'pharmacist':
        return 'primary';
      case 'cashier':
        return 'secondary';
      case 'customer':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      customer: 'Customer',
      cashier: 'Cashier',
      pharmacist: 'Pharmacist',
      branch_manager: 'Branch Manager'
    };
    return roleMap[role] || role;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}> {/* Add padding-top for fixed navbar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Staff Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage employee accounts
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStaff}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleDialogOpen}
            >
              Add Staff
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Staff Members ({staff.length})
            </Typography>
            
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ minHeight: 600, maxHeight: 800, overflow: 'auto' }}>
                <Table stickyHeader size="medium" sx={{ '& .MuiTableCell-root': { padding: '12px 16px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Full Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 160 }}>Created Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staff.map((user, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: user.role === 'branch_manager' ? 'bold' : 'normal',
                              color: user.role === 'branch_manager' ? 'error.main' : 'text.primary'
                            }}
                          >
                            {user.full_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleDisplay(user.role)}
                            color={getRoleColor(user.role)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {staff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No staff found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Add Staff Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Staff Member</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="full_name"
              label="Full Name"
              name="full_name"
              autoFocus
              value={formData.full_name}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              value={formData.password}
              onChange={handleInputChange}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleInputChange}
              >
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="pharmacist">Pharmacist</MenuItem>
                <MenuItem value="branch_manager">Branch Manager</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              fullWidth
              id="phone"
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={20} /> : 'Create Staff'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StaffManagement;
