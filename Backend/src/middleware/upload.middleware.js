import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith("image/")) return cb(null, true);
  cb(new Error("Only image files allowed"), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { files: 6, fileSize: 5 * 1024 * 1024 },
});
