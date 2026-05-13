import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    
    // Tùy chỉnh các variant khác nhau với Poppins
    h1: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
      textTransform: 'none', // Bỏ viết hoa tự động
    },
    caption: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 400,
    },
    subtitle1: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
    },
    subtitle2: {
      fontFamily: '"Poppins", sans-serif',
      fontWeight: 500,
    },
  },
  
  // Có thể tùy chỉnh thêm màu sắc
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  
  // Tùy chỉnh component styles để đảm bảo tất cả dùng Poppins
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            fontFamily: '"Poppins", sans-serif',
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Poppins", sans-serif',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: '"Poppins", sans-serif',
        },
      },
    },
  },
});

export default theme;
