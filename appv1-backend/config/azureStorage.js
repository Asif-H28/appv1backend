const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const sharp = require('sharp');
const { randomUUID } = require('crypto');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  console.error("❌ Missing AZURE_STORAGE_CONNECTION_STRING");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient('uploads');

// Multer memory storage (files are processed in RAM before uploading to Azure)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Upload buffer to Azure Blob Storage
 * @param {Buffer} buffer File buffer
 * @param {string} originalName Original file name
 * @param {string} mimeType Mime type
 * @param {string} folder Target folder inside the container
 */
const uploadToAzure = async (buffer, originalName, mimeType, folder = '') => {
  const extension = originalName.split('.').pop();
  const fileName = `${folder ? folder + '/' : ''}${randomUUID()}.${extension}`;
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);
  
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: mimeType }
  });

  return {
    url: blockBlobClient.url,
    publicId: fileName
  };
};

/**
 * Delete a file from Azure Blob Storage
 * @param {string} publicId File path / name in blob storage
 */
const deleteFromAzure = async (publicId) => {
  const blockBlobClient = containerClient.getBlockBlobClient(publicId);
  await blockBlobClient.delete();
};

module.exports = {
  upload,
  uploadToAzure,
  deleteFromAzure,
  sharp
};
