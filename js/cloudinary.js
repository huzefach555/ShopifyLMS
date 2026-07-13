const CLOUDINARY_CLOUD_NAME = 'z4xhjxfm';
const CLOUDINARY_UPLOAD_PRESET = 'student_uploads';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

export function uploadToCloudinary(file, folder = '', onProgress = null) {
  if (!file || !file.name) throw new Error('File is required.');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) form.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
          resolve(response);
        } else {
          reject(new Error(response.error?.message || 'Upload failed.'));
        }
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error('Upload request failed.'));
    xhr.send(form);
  });
}
