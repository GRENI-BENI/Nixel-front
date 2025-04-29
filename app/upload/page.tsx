'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { photoApi } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserId(user.id || null);

    const fetchTags = async () => {
      try {
        const tags = await photoApi.getTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error fetching tags:', error);
        setError('Failed to load available tags');
      }
    };

    fetchTags();
  }, []);

  useEffect(() => {
    if (tagInput.trim() === '') {
      setFilteredTags([]);
      return;
    }

    const filtered = availableTags.filter(tag => 
      tag.toLowerCase().startsWith(tagInput.toLowerCase()) &&
      !selectedTags.includes(tag)
    );
    setFilteredTags(filtered);
  }, [tagInput, availableTags, selectedTags]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !userId) return;

    setIsLoading(true);
    setError('');

    try {
      await photoApi.uploadPhoto({
        image: photoFile,
        title: formData.title,
        description: formData.description,
        tags: selectedTags
      });

      router.push(`/profile/${userId}`);
    } catch (error) {
      setError('Failed to upload photo. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => [...prev, tag]);
    setTagInput('');
    setIsTagsDropdownOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upload New Photo</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {!photoPreview ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer
              ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'hover:border-gray-500'}`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-300">
              {isDragActive
                ? 'Drop your photo here'
                : 'Drag and drop your photo here, or click to select'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports JPG, PNG and GIF
            </p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Upload preview"
              className="w-full aspect-video object-contain bg-gray-900 rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="absolute top-4 right-4 p-2 bg-gray-900/80 rounded-full hover:bg-gray-900"
            >
              <XMarkIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input-field w-full"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="input-field w-full"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => (
                <div
                  key={tag}
                  className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setIsTagsDropdownOpen(true);
                }}
                onFocus={() => setIsTagsDropdownOpen(true)}
                placeholder="Type to search tags..."
                className="input-field w-full"
              />
              {isTagsDropdownOpen && filteredTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagSelect(tag)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-400 hover:text-white"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!photoFile || isLoading}
          >
            {isLoading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </form>
    </div>
  );
}