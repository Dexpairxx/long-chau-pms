import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SalesReport = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    summary: {},
    monthlyRevenue: [],
    weeklyRevenue: [],
    dailyRevenue: [],
    topProducts: [],
    paymentMethodBreakdown: [],
    deliveryMethodBreakdown: []
  });

  useEffect(() => {
    if (user?.role === 'branch_manager') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/reports/dashboard');
      setDashboardData(response.data);
      setError('');
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to fetch dashboard data. Please check your connection.');
      
      // Clear data on error
      setDashboardData({
        summary: {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0
        },
        monthlyRevenue: [],
        weeklyRevenue: [],
        dailyRevenue: [],
        topProducts: [],
        paymentMethodBreakdown: [],
        deliveryMethodBreakdown: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (format) => {
    try {
      // Only PDF format is supported
      if (format === 'pdf') {
        // Check if data is available
        if (!dashboardData || !dashboardData.summary) {
          setError('No data available for PDF generation');
          return;
        }

        // Generate PDF locally using jsPDF
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('LC-PMS Sales Report', 20, 20);
        
        // Date range
        doc.setFontSize(12);
        doc.text('Report Period: All Data', 20, 35);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
        
        // Summary
        doc.setFontSize(16);
        doc.text('Summary', 20, 65);
        doc.setFontSize(10);
        doc.text(`Total Revenue: ${formatCurrency(dashboardData.summary.totalRevenue || 0)}`, 20, 75);
        doc.text(`Total Orders: ${dashboardData.summary.totalOrders || 0}`, 20, 85);
        doc.text(`Average Order Value: ${formatCurrency(dashboardData.summary.averageOrderValue || 0)}`, 20, 95);
        
        // Top Products Table - Use simple text instead of autoTable first
        let yPos = 105; // Initialize yPos variable
        if (dashboardData.topProducts && dashboardData.topProducts.length > 0) {
          doc.setFontSize(16);
          doc.text('Top Products', 20, 115);
          doc.setFontSize(10);
          
          yPos = 130;
          dashboardData.topProducts.slice(0, 10).forEach((product, index) => {
            const line = `${index + 1}. ${product.name} - Qty: ${product.totalQuantity} - Revenue: ${formatCurrency(product.totalRevenue)}`;
            doc.text(line, 20, yPos);
            yPos += 10;
          });
        }
        
        // Payment Methods
        if (dashboardData.paymentMethodBreakdown && dashboardData.paymentMethodBreakdown.length > 0) {
          doc.setFontSize(16);
          doc.text('Payment Methods', 20, yPos + 20);
          doc.setFontSize(10);
          
          let paymentY = yPos + 35;
          dashboardData.paymentMethodBreakdown.forEach(method => {
            const line = `${method.method}: ${method.count} orders - ${formatCurrency(method.revenue)}`;
            doc.text(line, 20, paymentY);
            paymentY += 10;
          });
        }
        
        // Save the PDF
        doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Download error:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      setError(`Failed to download report: ${error.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  if (user?.role !== 'branch_manager') {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, pt: '64px', textAlign: 'center' }}>
          <Typography variant="h4" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Only branch managers can access sales reports.
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4, pt: '64px' }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          mb: 3,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DashboardIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
                Sales Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Comprehensive sales analytics and insights - All data
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}>
            <Button
              variant="outlined"
              onClick={() => fetchDashboardData()}
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              Refresh Data
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadReport('pdf')}
              sx={{ minWidth: isMobile ? '100%' : 'auto' }}
            >
              Download PDF
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 3 }} >
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {formatCurrency(dashboardData.summary.totalRevenue || 0)}
                    </Typography>
                    <Typography variant="body2">
                      Total Revenue
                    </Typography>
                  </Box>
                  <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {dashboardData.summary.totalOrders || 0}
                    </Typography>
                    <Typography variant="body2">
                      Total Orders
                    </Typography>
                  </Box>
                  <ShoppingCartIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {formatCurrency(dashboardData.summary.averageOrderValue || 0)}
                    </Typography>
                    <Typography variant="body2">
                      Avg Order Value
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top Products Table - Moved to top and centered */}
        <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ width: '100%', maxWidth: '1200px' }}>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    Top Selling Products
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 500, boxShadow: 'none' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Product Name</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Quantity Sold</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Revenue</TableCell>
                          {!isMobile && (
                            <>
                              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Category</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Prescription Required</TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dashboardData.topProducts && dashboardData.topProducts.length > 0 ? (
                          dashboardData.topProducts.map((product, index) => (
                            <TableRow key={product.id} hover sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                              <TableCell component="th" scope="row" sx={{ py: 2 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                    #{index + 1} {product.name}
                                  </Typography>
                                  {isMobile && (
                                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                      <Chip 
                                        label={product.categoryName} 
                                        size="small" 
                                        variant="outlined" 
                                      />
                                      <Chip 
                                        label={product.requiresPrescription ? 'Prescription Required' : 'No Prescription'}
                                        size="small"
                                        color={product.requiresPrescription ? 'warning' : 'success'}
                                      />
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 2 }}>
                                <Chip 
                                  label={product.totalQuantity} 
                                  size="small" 
                                  color="primary" 
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ py: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                  {formatCurrency(product.totalRevenue)}
                                </Typography>
                              </TableCell>
                              {!isMobile && (
                                <>
                                  <TableCell align="center" sx={{ py: 2 }}>
                                    <Chip 
                                      label={product.categoryName} 
                                      size="small" 
                                      variant="outlined" 
                                    />
                                  </TableCell>
                                  <TableCell align="center" sx={{ py: 2 }}>
                                    <Chip 
                                      label={product.requiresPrescription ? 'Yes' : 'No'}
                                      size="small"
                                      color={product.requiresPrescription ? 'warning' : 'success'}
                                    />
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={isMobile ? 3 : 5} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No products data available
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Monthly Revenue - Full Width Row */}
        <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ width: '100%', maxWidth: '1200px' }}>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                    Monthly Revenue Trend
                  </Typography>
                  {dashboardData.monthlyRevenue && dashboardData.monthlyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                      <LineChart data={dashboardData.monthlyRevenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ height: isMobile ? 300 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No monthly data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Weekly Revenue - Full Width Row */}
        <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ width: '100%', maxWidth: '1200px' }}>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                    Weekly Revenue Trend
                  </Typography>
                  {dashboardData.weeklyRevenue && dashboardData.weeklyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                      <AreaChart data={dashboardData.weeklyRevenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={(label) => `Week: ${label}`}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#82ca9d" fill="#82ca9d" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ height: isMobile ? 300 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No weekly data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Daily Revenue - Full Width Row */}
        <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Card sx={{ width: '100%', maxWidth: '1200px' }}>
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
                    Daily Revenue (Last 30 Days)
                  </Typography>
                  {dashboardData.dailyRevenue && dashboardData.dailyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 300 : 400}>
                      <BarChart data={dashboardData.dailyRevenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Bar dataKey="revenue" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ height: isMobile ? 300 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No daily data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Payment & Delivery Methods */}
        <Grid container spacing={3} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ pb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Payment Method Distribution
                </Typography>
                {dashboardData.paymentMethodBreakdown && dashboardData.paymentMethodBreakdown.length > 0 ? (
                  <Box>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <Pie
                          data={dashboardData.paymentMethodBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {dashboardData.paymentMethodBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value, name) => [value, 'Orders']}
                          labelFormatter={(label) => `Payment: ${label}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Legend Table */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Payment Methods:
                      </Typography>
                      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Method</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', py: 1 }}>Orders</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', py: 1 }}>Revenue</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dashboardData.paymentMethodBreakdown.map((method, index) => (
                              <TableRow key={method.method}>
                                <TableCell sx={{ py: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box 
                                      sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        backgroundColor: COLORS[index % COLORS.length],
                                        borderRadius: '2px',
                                        mr: 1 
                                      }} 
                                    />
                                    {method.method}
                                  </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>{method.count}</TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>{formatCurrency(method.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No payment method data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ pb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Delivery Method Revenue
                </Typography>
                {dashboardData.deliveryMethodBreakdown && dashboardData.deliveryMethodBreakdown.length > 0 ? (
                  <Box>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dashboardData.deliveryMethodBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="method" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value, name) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={(label) => `Delivery: ${label}`}
                        />
                        <Bar dataKey="revenue" fill="#ff7300" />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    {/* Legend Table */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Delivery Methods:
                      </Typography>
                      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Method</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', py: 1 }}>Orders</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', py: 1 }}>Revenue</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dashboardData.deliveryMethodBreakdown.map((method, index) => (
                              <TableRow key={method.method}>
                                <TableCell sx={{ py: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box 
                                      sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        backgroundColor: '#ff7300',
                                        borderRadius: '2px',
                                        mr: 1 
                                      }} 
                                    />
                                    {method.method}
                                  </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>{method.count}</TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>{formatCurrency(method.revenue)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No delivery method data available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default SalesReport;