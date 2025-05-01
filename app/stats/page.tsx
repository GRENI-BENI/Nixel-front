'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PhotoIcon, HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import {userApi, photoApi, type User, type Photo} from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL;

interface Stats {
  totalLikes: number;
  totalComments: number;
  mostLikedPhoto: Photo | null;
  recentPhotos: Photo[];
}

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalLikes: 0,
    totalComments: 0,
    mostLikedPhoto: null,
    recentPhotos: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id) {
          throw new Error('User not found');
        }

        // Fetch user details and photos
        const [userDetails, userPhotos] = await Promise.all([
          userApi.getUser(userData.id),
          userApi.getUserPhotos(userData.nickname)
        ]);

        setUser(userDetails);

        // Calculate statistics
        const photos = userPhotos.content;
        const totalLikes = photos.reduce((sum:number, photo:Photo) => sum + photo.likesCount, 0);
        const mostLikedPhoto = photos.reduce((prev:Photo, current:Photo) =>
          (prev?.likesCount || 0) > current.likesCount ? prev : current
        , null);

        setStats({
          totalLikes,
          totalComments: 0, // This would need a separate API endpoint to get total comments
          mostLikedPhoto,
          recentPhotos: photos.slice(0, 6)
        });

      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error || !user) {
    return (
      <div className="text-center py-8 text-red-500">
        {error || 'Failed to load statistics'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Statistics</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <PhotoIcon className="w-8 h-8 text-indigo-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-300">Total Photos</h3>
              <p className="text-2xl font-bold">{stats.recentPhotos.length}</p>
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
                  <Image
                    src={IMAGES_BASE_URL + stats.mostLikedPhoto.url}
                    alt={stats.mostLikedPhoto.title || 'Most liked photo'}
                    width={800}
                    height={256}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Photos */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Recent Photos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.recentPhotos.map(photo => (
            <Link
              key={photo.id}
              href={`/photos/${photo.id}`}
              className="relative aspect-square group overflow-hidden rounded-lg"
            >
              <Image
                src={IMAGES_BASE_URL + photo.url}
                alt={photo.title || 'User photo'}
                width={300}
                height={300}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="text-white text-sm">❤️ {photo.likesCount}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
