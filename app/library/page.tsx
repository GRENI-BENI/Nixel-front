'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PhotoIcon, HeartIcon, ChatBubbleLeftIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { userApi, photoApi, commentApi, type User, type UserPhoto } from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL;

interface Stats {
  totalLikes: number;
  totalComments: number;
  mostLikedPhoto: UserPhoto | null;
  photos: UserPhoto[];
}

export default function LibraryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalLikes: 0,
    totalComments: 0,
    mostLikedPhoto: null,
    photos: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<{
    id: string;
    title: string;
    description: string;
    tags: string;
  } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id) {
          throw new Error('User not found');
        }

        const [userDetails, userPhotos, commentsCount] = await Promise.all([
          userApi.getUser(userData.id),
          userApi.getUserPhotos(userData.nickname),
          commentApi.getUserCommentsCount()
        ]);

        setUser(userDetails);

        const photos = userPhotos.content;
        const totalLikes = photos.reduce((sum, photo) => sum + photo.likesCount, 0);
        const mostLikedPhoto = photos.reduce((prev, current) => 
          (prev?.likesCount || 0) > current.likesCount ? prev : current
        , null);

        setStats({
          totalLikes,
          totalComments: commentsCount.totalCommentsCount,
          mostLikedPhoto,
          photos
        });

      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load library');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

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

      setStats(prev => ({
        ...prev,
        photos: prev.photos.map(photo =>
          photo.id === editingPhoto.id ? { ...photo, ...updatedPhoto } : photo
        )
      }));
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
      setStats(prev => ({
        ...prev,
        photos: prev.photos.filter(photo => photo.id !== photoToDelete)
      }));
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
        {error || 'Failed to load library'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Library</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <PhotoIcon className="w-8 h-8 text-indigo-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-300">Total Photos</h3>
              <p className="text-2xl font-bold">{stats.photos.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <HeartIcon className="w-8 h-8 text-pink-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-300">Total Likes</h3>
              <p className="text-2xl font-bold">{stats.totalLikes}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <ChatBubbleLeftIcon className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-300">Total Comments</h3>
              <p className="text-2xl font-bold">{stats.totalComments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Most Liked Photo */}
      {stats.mostLikedPhoto && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Most Liked Photo</h2>
          <div className="card p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-96">
                <Link href={`/photos/${stats.mostLikedPhoto.id}`} className="block">
                  <img
                    src={IMAGES_BASE_URL + stats.mostLikedPhoto.url}
                    alt={stats.mostLikedPhoto.title || 'Most liked photo'}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </Link>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">
                  {stats.mostLikedPhoto.title || 'Untitled'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {stats.mostLikedPhoto.description || 'No description'}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <HeartIcon className="w-5 h-5 text-pink-500" />
                    <span>{stats.mostLikedPhoto.likesCount} likes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChatBubbleLeftIcon className="w-5 h-5 text-green-500" />
                    <span>{stats.totalComments} comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Photos */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Photos</h2>
          <Link
            href="/upload"
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Upload New Photo
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <Link
                href={`/photos/${photo.id}`}
                className="block relative aspect-square overflow-hidden rounded-lg"
              >
                <img
                  src={IMAGES_BASE_URL + photo.url}
                  alt={photo.title || 'User photo'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="text-white text-lg">❤️ {photo.likesCount}</div>
                </div>
              </Link>
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
            </div>
          ))}
        </div>
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