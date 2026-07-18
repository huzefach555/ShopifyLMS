const CLOUDINARY_CLOUD_NAME = 'z4xhjxfm';
const CLOUDINARY_UPLOAD_PRESET = 'student_uploads';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
// Optional signing endpoint (relative path). Set up the example server at /server/cloudinary-sign.js
const CLOUDINARY_SIGN_ENDPOINT = '/sign';

export function uploadToCloudinary(file, folder = '', onProgress = null) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!file || !file.name) throw new Error('File is required.');

      const form = new FormData();
      form.append('file', file);

      // Try to get a signed upload from the optional sign endpoint. If it exists, include signature params.
      let signed = false;
      try {
        const signResp = await fetch(CLOUDINARY_SIGN_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder })
        });
        if (signResp && signResp.ok) {
          const payload = await signResp.json();
          if (payload.signature && payload.timestamp && payload.apiKey) {
            form.append('api_key', payload.apiKey);
            form.append('timestamp', String(payload.timestamp));
            form.append('signature', payload.signature);
            signed = true;
          }
        }
      } catch (e) {
        // sign endpoint not available or failed — fall back to unsigned preset upload
      }

      if (!signed) {
        form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      }
      if (folder) form.append('folder', folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_UPLOAD_URL);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
            resolve(response);
          } else {
            const message = response.error?.message || `Cloudinary upload failed (status ${xhr.status})`;
            reject(new Error(message));
          }
        } catch (err) {
          reject(err);
        }
      };
      xhr.onerror = () => reject(new Error('Upload request failed.'));
      xhr.send(form);
    } catch (err) {
      reject(err);
    }
  });
}
