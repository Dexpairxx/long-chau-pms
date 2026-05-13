import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Container,
  Grid,
  Link,
  Divider
} from '@mui/material';
import { 
  AccountCircle, 
  Logout,
  Phone,
  Email,
  LocationOn,
  Facebook,
  Twitter,
  Instagram
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Page configuration for each role
const ROLE_PAGES = {
  customer: [
    { path: '/home', label: 'Home' },
    { path: '/cart', label: 'Shopping Cart' },
    { path: '/order-status', label: 'Order Status' }
  ],
  cashier: [
    { path: '/home', label: 'Home' },
    { path: '/in-store-order', label: 'In-Store Order' },
    { path: '/warehouse', label: 'Warehouse' },
    { path: '/order-management', label: 'Order Management' }
  ],
  pharmacist: [
    { path: '/home', label: 'Home' },
    { path: '/prescription-validator', label: 'Prescription Validator' }
  ],
  branch_manager: [
    { path: '/home', label: 'Home' },
    { path: '/warehouse', label: 'Warehouse Management' },
    { path: '/order-management', label: 'Order Management' },
    { path: '/sales-report', label: 'Sales Report' },
    { path: '/staff-management', label: 'Staff Management' },
    { path: '/promotions', label: 'Promotions' }
  ]
};

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const userPages = ROLE_PAGES[user?.role] || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          backgroundImage: 'url("https://cdn.nhathuoclongchau.com.vn/unsafe/2560x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/header_desktop_f832104627.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxShadow: 'none',
          zIndex: 1200
        }}
      >
        <Toolbar>
          {/* Logo */}
          <Box
            sx={{
              flexGrow: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={() => navigate('/home')}
          >
            <img
              src={'logo/lcpm.webp'}
              alt="LC-PMS Logo"
              style={{ height: 40 }}
            />
          </Box>

          {/* User Info */}
          {/* <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.full_name} ({user?.role})
          </Typography> */}

          {/* Menu Button */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account menu"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <AccountCircle sx={{ fontSize: 40 }} />
          </IconButton>

          {/* Dropdown Menu */}
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            disableScrollLock
          >
            {/* Navigation Pages */}
            {userPages.map((page) => (
              <MenuItem 
                key={page.path} 
                onClick={() => handleNavigate(page.path)}
              >
                {page.label}
              </MenuItem>
            ))}
            
            {/* Divider */}
            {userPages.length > 0 && (
              <MenuItem divider disabled sx={{ borderBottom: '1px solid #ccc' }}>
              </MenuItem>
            )}
            
            {/* Logout */}
            <MenuItem onClick={handleLogout}>
              <Logout/>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
        
        {/* Footer */}
        <Box 
          component="footer" 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            py: 4,
            mt: 'auto'
          }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={4}>
              <Grid item xs={12} sm={4} sx={{maxWidth: '40%'}}>
                <Typography variant="h6" gutterBottom sx={{maxWidth: '100%',
                  fontSize: { xs: '12px', sm: '16px', md: '22px' },
                  fontWeight: '600'
                }}>
                  FPT Long Chau Pharmacy
                </Typography>
                <Typography variant="body2" 
                sx={{ 
                  mb: 2, 
                  maxWidth: '100%',       
                  wordWrap: 'break-word', 
                  whiteSpace: 'normal', 
                  fontSize: '0.8rem'
                }}
                >
                  Your trusted healthcare partner, providing quality medications and professional pharmaceutical services since 1995.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton color="inherit" size="small">
                    <Facebook />
                  </IconButton>
                  <IconButton color="inherit" size="small">
                    <Twitter />
                  </IconButton>
                  <IconButton color="inherit" size="small">
                    <Instagram />
                  </IconButton>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}  sx={{maxWidth: '30%', mx: '12px'}}>
                <Typography variant="h6" gutterBottom 
                sx={{
                  fontSize: { xs: '12px', sm: '16px', md: '22px' },
                  fontWeight: '600'}}>
                  Quick Links
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Link href="/home" color="inherit" underline="hover"
                  sx={{ fontSize: '0.8rem'}}>
                    Shop Products
                  </Link>
                  <Link href="/prescription-validator" color="inherit" underline="hover"
                  sx={{ fontSize: '0.8rem'}}>
                    Prescription Services
                  </Link>
                  <Link href="/order-status" color="inherit" underline="hover"
                  sx={{ fontSize: '0.8rem'}}>
                    Track Your Order
                  </Link>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}  sx={{maxWidth: '30%'}}>
                <Typography variant="h6" gutterBottom sx={{
                  fontSize: { xs: '12px', sm: '16px', md: '22px' },
                  fontWeight: '600'
                  }}>
                  Contact Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1,  }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" />
                    <Typography variant="body2" sx={{fontSize: '0.8rem'}}>+84 (028) 3822 5555</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" />
                    <Typography variant="body2" sx={{fontSize: '0.8rem'}}>info@longchau.com.vn</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small"/>
                    <Typography variant="body2" sx={{fontSize: '0.8rem'}}>123 Healthcare Street, District 1, Ho Chi Minh City</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.3)' }} />
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="rgba(255,255,255,0.8)">
                © 2025 FPT Long Chau Pharmacy Management System. All rights reserved.
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
