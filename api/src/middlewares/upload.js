import multer from 'multer';
import { ValidationError } from '../errors/app-error.js';

function toUploadError(err) {
  if (!(err instanceof multer.MulterError)) return err;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('FILE_TOO_LARGE', 'File vượt quá dung lượng cho phép');
  }
  // Sai tên field, quá nhiều file, ...
  return new ValidationError('VALIDATION_ERROR', 'Invalid request data', [
    { path: err.field ?? '', message: err.message },
  ]);
}

// Nhận đúng một file ở field `field`, giữ trong bộ nhớ (req.file.buffer).
// Sai loại → 400 INVALID_FILE_TYPE; quá maxBytes → 400 FILE_TOO_LARGE; thiếu file → 400.
export function singleFileUpload({ field, maxBytes, allowedTypes }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(_req, file, cb) {
      if (allowedTypes.includes(file.mimetype)) return cb(null, true);
      return cb(
        new ValidationError('INVALID_FILE_TYPE', `Chỉ chấp nhận: ${allowedTypes.join(', ')}`),
      );
    },
  }).single(field);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) return next(toUploadError(err));
      if (!req.file) {
        return next(
          new ValidationError('VALIDATION_ERROR', 'Invalid request data', [
            { path: field, message: 'Thiếu file' },
          ]),
        );
      }
      return next();
    });
  };
}
