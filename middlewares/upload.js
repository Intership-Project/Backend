const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Destination folder
const uploadDir = path.join(process.cwd(), 'uploads/feedback_reports');

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
   
    cb(null, file.originalname);
  }
});

// File filter (optional, only pdf)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
