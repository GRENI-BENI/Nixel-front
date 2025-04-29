'use client';

import { useState, useEffect } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { HeartIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { photoApi, type Photo } from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL || 'https://pixel-photos-bucket.s3.eu-central-1.amazonaws.com';

export default function PhotoFeed() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 12;

  const fetchPhotos = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { content: newPhotos, totalElements } = await photoApi.getTrendingPhotos({ 
        page: page, 
        size: LIMIT 
      });

      setPhotos(prev => {
        // Filter out any duplicates
        const uniquePhotos = newPhotos.filter(
            (newPhoto:Photo) => !prev.some(p => p.id === newPhoto.id)
        );
        return [...prev, ...uniquePhotos];
      });
      
      setTotalCount(totalElements);
      setHasMore(photos.length + newPhotos.length < totalElements);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setError('Unable to load photos. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialFetch = async () => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { content: newPhotos, totalElements } = await photoApi.getTrendingPhotos({ 
          page: 0, 
          size: LIMIT 
        });

        if (!mounted) return;

        setPhotos(newPhotos);
        setTotalCount(totalElements);
        setHasMore(newPhotos.length < totalElements);
        setPage(1);
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching photos:', error);
        setError('Unable to load photos. Please try again later.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialFetch();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLike = async (photoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;

      if (photo.likedByCurrentUser) {
        await photoApi.unlikePhoto(photoId);
      } else {
        await photoApi.likePhoto(photoId);
      }

      setPhotos(photos.map(photo =>
        photo.id === photoId
          ? { 
              ...photo, 
              liked: !photo.likedByCurrentUser,
              likesCount: photo.likedByCurrentUser ? photo.likesCount - 1 : photo.likesCount + 1
            }
          : photo
      ));
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <ExclamationCircleIcon className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-200 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setPage(0);
            setPhotos([]);
            fetchPhotos();
          }}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <InfiniteScroll
      dataLength={photos.length}
      next={fetchPhotos}
      hasMore={hasMore}
      loader={
        <div className="flex justify-center py-8">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          </div>
        </div>
      }
    >
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
        {photos.map((photo) => (
          <Link
            key={photo.id}
            href={`/photos/${photo.id}`}
            className="relative block mb-4 break-inside-avoid group"
          >
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={IMAGES_BASE_URL+photo.url}
                alt={`Photo by ${photo.nickname}`}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img
                        src={IMAGES_BASE_URL+photo.userProfileImage || '/default-avatar.png'}
                        alt={photo.nickname}
                        className="w-8 h-8 rounded-full border border-white/20"
                      />
                      <span className="text-white font-medium">{photo.nickname}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white">{photo.likesCount}</span>
                      <button
                        onClick={(e) => handleLike(photo.id, e)}
                        className={`text-white transition-colors ${photo.likedByCurrentUser ? 'text-pink-500' : 'hover:text-pink-500'}`}
                      >
                        {photo.likedByCurrentUser ? (
                          <HeartSolidIcon className="w-6 h-6" />
                        ) : (
                          <HeartIcon className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </InfiniteScroll>
  );
}