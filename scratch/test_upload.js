const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const form = new FormData();
  // Create a dummy file
  const filePath = path.join(__dirname, 'test.txt');
  fs.writeFileSync(filePath, 'Hello Trek ERP');
  
  form.append('files', fs.createReadStream(filePath));

  try {
    const response = await axios.post('http://localhost:5000/api/upload', form, {
      headers: form.getHeaders(),
    });
    console.log('Upload Success:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Upload Failed:', error.response?.data || error.message);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

testUpload();
