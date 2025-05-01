'use client';

import { useState, useCallback } from 'react';
import { UserCircleIcon, PencilIcon, CameraIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import Image from 'next/image';

// Temporary mock data
const MOCK_USER = {
  name: 'John Doe',
  about: 'Professional photographer with a passion for landscape and wildlife photography. Based in New York City.',
  photoCount: 48,
  profileImage: null
};

const MOCK_PHOTOS = Array(9).fill(null).map((_, i) => ({
  id: i,
  url: `https://source.unsplash.com/random/800x600?landscape&sig=${i}`,
  likes: 100 + i,
  selected: false
}));

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [about, setAbout] = useState(MOCK_USER.about);
  const [profileImage, setProfileImage] = useState<string | null>(MOCK_USER.profileImage);
  const [photos, setPhotos] = useState(MOCK_PHOTOS);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfileImage(reader.result as string);
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

  const handleSave = () => {
    setIsEditing(false);
  };

  const togglePhotoSelection = (photoId: number) => {
    setPhotos(photos.map(photo =>
        photo.id === photoId ? { ...photo, selected: !photo.selected } : photo
    ));
  };

  const handleDeletePhoto = (photoId: number) => {
    setPhotoToDelete(photoId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePhoto = () => {
    if (photoToDelete !== null) {
      setPhotos(photos.filter(p => p.id !== photoToDelete));
    }
    setShowDeleteConfirmation(false);
    setPhotoToDelete(null);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirmation(true);
  };

  const confirmBulkDelete = () => {
    setPhotos(photos.filter(photo => !photo.selected));
    setShowBulkDeleteConfirmation(false);
    setIsSelectionMode(false);
  };

  const selectedCount = photos.filter(photo => photo.selected).length;

  return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          <div className="relative group">
            <div
                {...getRootProps()}
                className="cursor-pointer relative w-32 h-32 rounded-full overflow-hidden group"
            >
              <input {...getInputProps()} />
              {profileImage ? (
                  <Image
                      src={profileImage}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                  />
              ) : (
                  <UserCircleIcon className="w-32 h-32 text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <CameraIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-4">{MOCK_USER.name}</h1>

            <div className="flex justify-center md:justify-start gap-8 mb-6">
              <div>
                <div className="text-2xl font-bold">{photos.length}</div>
                <div className="text-gray-400">Photos</div>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">About</h2>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-indigo-400 hover:text-indigo-300"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              </div>

              {isEditing ? (
                  <div className="space-y-2">
                <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                    <div className="flex justify-end gap-2">
                      <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                          onClick={handleSave}
                          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
              ) : (
                  <p className="text-gray-300">{about}</p>
              )}
            </div>
          </div>
        </div>

        {/* Photos Management */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Photos</h2>
            <div className="flex gap-4">
              <Link
                  href="/upload"
                  className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Upload New Photo
              </Link>
              {photos.length > 0 && (
                  <button
                      onClick={() => setIsSelectionMode(!isSelectionMode)}
                      className="px-4 py-2 text-white border border-gray-600 rounded-lg hover:bg-gray-800"
                  >
                    {isSelectionMode ? 'Cancel' : 'Select Photos'}
                  </button>
              )}
            </div>
          </div>

          {isSelectionMode && selectedCount > 0 && (
              <div className="flex justify-between items-center mb-4 p-4 bg-gray-800 rounded-lg">
                <span>{selectedCount} photo{selectedCount !== 1 ? 's' : ''} selected</span>
                <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <TrashIcon className="w-5 h-5" />
                  Delete Selected
                </button>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                        src={photo.url}
                        alt="User uploaded photo"
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                    />
                    {isSelectionMode && (
                        <button
                            onClick={() => togglePhotoSelection(photo.id)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center"
                        >
                          <div className={`w-6 h-6 rounded-full border-2 ${photo.selected ? 'bg-indigo-600 border-indigo-600' : 'border-white'}`} />
                        </button>
                    )}
                    {!isSelectionMode && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="text-white text-lg">❤️ {photo.likes}</div>
                        </div>
                    )}
                  </div>
                  {!isSelectionMode && (
                      <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2 right-2 p-2 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <TrashIcon className="w-4 h-4 text-white" />
                      </button>
                  )}
                </div>
            ))}
          </div>
        </div>

        {/* Single Photo Delete Confirmation Modal */}
        {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">Delete Photo</h3>
                <p className="text-gray-300 mb-6">Are you sure you want to delete this photo? This action cannot be undone.</p>
                <div className="flex justify-end gap-4">
                  <button
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={confirmDeletePhoto}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">Delete Selected Photos</h3>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete {selectedCount} selected photo{selectedCount !== 1 ? 's' : ''}?
                  This action cannot be undone.
                </p>
                <div className="flex justify-end gap-4">
                  <button
                      onClick={() => setShowBulkDeleteConfirmation(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={confirmBulkDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete {selectedCount} Photo{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
