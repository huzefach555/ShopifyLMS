// Example Express server to create signed Cloudinary upload parameters.
// Usage: set CLOUDINARY_API_SECRET and CLOUDINARY_API_KEY and CLOUDINARY_CLOUD_NAME in env.

const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!API_SECRET || !API_KEY || !CLOUD_NAME) {
  console.warn('Cloudinary env vars missing. Set CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME');
}

app.post('/sign', (req, res) => {
  // Accept folder and optional timestamp
  const folder = req.body.folder || '';
  const timestamp = Math.floor(Date.now()/1000);
  // Build signature string
  const paramsToSign = `timestamp=${timestamp}` + (folder ? `&folder=${folder}` : '');
  const signature = crypto.createHash('sha1').update(paramsToSign + API_SECRET).digest('hex');
  res.json({ signature, apiKey: API_KEY, timestamp, cloudName: CLOUD_NAME });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Cloudinary sign server listening on', port));
