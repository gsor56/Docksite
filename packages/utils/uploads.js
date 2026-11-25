import multer from 'multer';
import { config } from '@docksite/config';
import { HttpError } from './http.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.UPLOAD_MAX_BYTES, files: 1, fields: 8, fieldSize: 4096 },
  fileFilter: (req, file, callback) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.mimetype))
      return callback(new HttpError(422, 'Only PNG, JPEG, WebP, and GIF files are accepted.'));
    callback(null, true);
  },
});
export function imageType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mime: 'image/png', extension: 'png' };
  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return { mime: 'image/jpeg', extension: 'jpg' };
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString()))
    return { mime: 'image/gif', extension: 'gif' };
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP')
    return { mime: 'image/webp', extension: 'webp' };
  throw new HttpError(422, 'File content does not match a supported image type.');
}
