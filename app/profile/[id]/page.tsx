'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { UserCircleIcon, PhotoIcon, PencilIcon, TrashIcon, PlusIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { userApi, photoApi, type User, type UserPhoto } from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL;

export default function ProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [user, setUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [about, setAbout] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<{
    id: string;
    title: string;
    description: string;
    tags: string;
  } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  useEffect(() => {
    const checkCurrentUser = () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setIsCurrentUser(currentUser.id === id);
    };
    checkCurrentUser();
  }, [id]);

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await userApi.getUser(id);
      setUser(userData);
      setAbout(userData.about || '');
      
      const userPhotos = await userApi.getUserPhotos(userData.nickname);
      setPhotos(userPhotos.content);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && user) {
      try {
        setUploadError(null);
        const response = await userApi.updateProfileImage(user.id, file);
        setUser(prev => prev ? { ...prev, profileImage: response.profileImage } : null);
        window.location.reload();
      } catch (error: any) {
        console.error('Error updating profile image:', error);
        if (error.message === 'Maximum upload size exceeded') {
          setUploadError('Image size is too large. Please choose a smaller image (max 5MB).');
        } else {
          setUploadError('Failed to update profile image. Please try again.');
        }
      }
    }
  }, [user]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024
  });

  const handleSave = async () => {
    if (!user) return;
    try {
      const updatedUser = await userApi.updateAbout(about);
      setUser(prev => ({ ...prev!, ...updatedUser }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleEditPhoto = (photo: UserPhoto) => {
    setEditingPhoto({
      id: photo.id,
      title: photo.title || '',
      description: photo.description || '',
      tags: photo.tags?.join(', ') || ''
    });
  };

  const handleUpdatePhoto = async () => {
    if (!editingPhoto) return;

    try {
      const updatedPhoto = await photoApi.updatePhoto(editingPhoto.id, {
        title: editingPhoto.title,
        description: editingPhoto.description,
        tags: editingPhoto.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      });

      setPhotos(photos.map(photo =>
        photo.id === editingPhoto.id ? { ...photo, ...updatedPhoto } : photo
      ));
      setEditingPhoto(null);
    } catch (error) {
      console.error('Error updating photo:', error);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotoToDelete(photoId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      await photoApi.deletePhoto(photoToDelete);
      setPhotos(photos.filter(photo => photo.id !== photoToDelete));
      setShowDeleteConfirmation(false);
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error || !user) {
    return (
      <div className="text-center py-8 text-red-500">
        {error || 'Failed to load profile'}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className="relative group">
          {isCurrentUser ? (
            <div className="space-y-2">
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                {user.profileImage ? (
                  <img
                    src={IMAGES_BASE_URL + user.profileImage}
                    alt={user.nickname}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-32 h-32 text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <PencilIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              {uploadError && (
                <div className="text-red-500 text-sm text-center max-w-[200px]">
                  {uploadError}
                </div>
              )}
            </div>
          ) : (
            <div className="w-32 h-32">
              {user.profileImage ? (
                <img
                  src={IMAGES_BASE_URL + user.profileImage}
                  alt={user.nickname}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserCircleIcon className="w-32 h-32 text-gray-400" />
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-4">{user.nickname}</h1>
          
          <div className="flex justify-center md:justify-start gap-8 mb-6">
            <div>
              <div className="text-2xl font-bold">{photos.length}</div>
              <div className="text-gray-400">Photos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{user.followersCount}</div>
              <div className="text-gray-400">Followers</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{user.followingCount}</div>
              <div className="text-gray-400">Following</div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold">About</h2>
              {isCurrentUser && (
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
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
              <p className="text-gray-300">{about || 'No bio yet'}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Photos</h2>
            {isCurrentUser && (
              <Link
                href="/library"
                className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
              >
                <BookOpenIcon className="w-5 h-5" />
                <span>Go to Library</span>
              </Link>
            )}
          </div>
          {isCurrentUser && (
            <Link
              href="/upload"
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Upload New Photo
            </Link>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-lg">
            <PhotoIcon className="w-24 h-24 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Photos Yet</h3>
            <p className="text-gray-400 mb-6">Start sharing your amazing photos with the world!</p>
            {isCurrentUser && (
              <Link 
                href="/upload" 
                className="inline-flex items-center gap-2 btn-primary"
              >
                Upload Your First Photo
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <Link
                  href={`/photos/${photo.id}`}
                  className="block relative aspect-square overflow-hidden rounded-lg"
                >
                  <img
                    src={IMAGES_BASE_URL + photo.url}
                    alt={`Photo by ${photo.nickname}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-lg">❤️ {photo.likesCount}</div>
                  </div>
                </Link>
                {isCurrentUser && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditPhoto(photo)}
                      className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
                    >
                      <PencilIcon className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-2 bg-red-600 rounded-full hover:bg-red-700"
                    >
                      <TrashIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Photo Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Photo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingPhoto.title}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editingPhoto.description}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, description: e.target.value })}
                  className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editingPhoto.tags}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, tags: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setEditingPhoto(null)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePhoto}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Delete Photo</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this photo? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setPhotoToDelete(null);
                }}
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
    </div>
  );
}