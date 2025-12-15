import React, { useState } from 'react';
import { Form, Button, Alert, Image } from 'react-bootstrap';
import { uploadImage } from '../api/students';

/**
 * ImageUpload Component - Cloudinary Ready
 * This component handles image upload and can be easily integrated with Cloudinary
 */
const ImageUpload = ({ value, onChange, label = 'Profile Image', maxSizeMB = 5 }) => {
  const [preview, setPreview] = useState(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to backend (will be integrated with Cloudinary)
      try {
        const response = await uploadImage(file);
        
        if (response.success && response.imageUrl) {
          // Call onChange with the image URL (Cloudinary URL)
          onChange(response.imageUrl);
        } else {
          throw new Error(response.message || 'Upload failed');
        }
      } catch (uploadError) {
        // If upload fails, still show preview but don't set URL
        // User can proceed without image or retry
        console.warn('Image upload failed, showing preview only:', uploadError);
        setError('Image upload failed. You can still save the form, but image won\'t be uploaded.');
        // Don't throw - allow form submission without image
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setError(error?.response?.data?.message || error.message || 'Failed to upload image');
      // Still set preview for local display
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    setError('');
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      {preview && (
        <div className="mb-2">
          <Image 
            src={preview} 
            thumbnail 
            style={{ maxHeight: '200px', maxWidth: '200px' }}
            alt="Preview"
          />
        </div>
      )}
      <Form.Control
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <Form.Text className="text-muted">
        Accepted formats: JPG, PNG, GIF. Max size: {maxSizeMB}MB
        {value && value.startsWith('http') && (
          <span className="text-success ms-2">✓ Image uploaded</span>
        )}
      </Form.Text>
      {error && (
        <Alert variant="danger" className="mt-2" style={{ fontSize: '0.875rem' }}>
          {error}
        </Alert>
      )}
      {preview && (
        <Button
          variant="outline-danger"
          size="sm"
          onClick={handleRemove}
          className="mt-2"
          disabled={uploading}
        >
          Remove Image
        </Button>
      )}
    </Form.Group>
  );
};

export default ImageUpload;

