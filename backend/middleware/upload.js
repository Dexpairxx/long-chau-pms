const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/products'),
    path.join(__dirname, '../uploads/prescriptions')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Configure storage for different file types
const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads', subfolder);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, subfolder + '-' + uniqueSuffix + extension);
    }
  });
};

// File filter for images only
const imageFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Product image upload configuration
const productImageUpload = multer({
  storage: createStorage('products'),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

// Prescription image upload configuration
const prescriptionImageUpload = multer({
  storage: createStorage('prescriptions'),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  }
});

module.exports = {
  productImageUpload,
  prescriptionImageUpload
};
