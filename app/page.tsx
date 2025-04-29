'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExclamationCircleIcon, CameraIcon, UserGroupIcon, HeartIcon, TagIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { photoApi, type Photo } from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL;

const features = [
  {
    icon: CameraIcon,
    title: 'High-Quality Photo Sharing',
    description: 'Upload and share your photos in their original quality. No compression, no quality loss.'
  },
  {
    icon: UserGroupIcon,
    title: 'Vibrant Community',
    description: 'Connect with photographers worldwide, share experiences, and grow together.'
  },
  {
    icon: HeartIcon,
    title: 'Engagement & Feedback',
    description: 'Get likes and comments from the community to improve your photography skills.'
  },
  {
    icon: TagIcon,
    title: 'Smart Organization',
    description: 'Use tags to organize your photos and make them easily discoverable.'
  },
  {
    icon: GlobeAltIcon,
    title: 'Global Exposure',
    description: 'Reach a worldwide audience and get your work seen by photography enthusiasts.'
  }
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Professional Photographer',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
    content: 'This platform has transformed how I share my work. The community feedback is invaluable.'
  },
  {
    name: 'Michael Chen',
    role: 'Photography Enthusiast',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
    content: "I've learned so much from other photographers here. It's more than just a photo-sharing site."
  },
  {
    name: 'Emma Wilson',
    role: 'Travel Photographer',
    image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    content: 'The perfect platform to showcase my travel photography and connect with like-minded creators.'
  }
];

export default function LandingPage() {
  const [featuredPhotos, setFeaturedPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedPhotos();
  }, []);

  const fetchFeaturedPhotos = async () => {
    try {
      setIsLoading(true);
      setError(null);
    
      const photos = (await photoApi.getTrendingPhotos({ page: 0, size: 6 })).content;
      setFeaturedPhotos(photos);
    } catch (error) {
      console.error('Error fetching featured photos:', error);
      setError('Unable to load featured photos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-4rem)] ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/50 to-background z-10" />
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1666021/pexels-photo-1666021.jpeg"
            alt="Photography background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-20 container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
            Showcase Your Photography to the World
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12">
            Join our thriving community of photographers. Share your vision, get inspired,
            and connect with creators from around the globe.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link 
              href="/discover" 
              className="inline-flex items-center gap-2 px-8 py-3 text-lg text-white border-2 border-indigo-600 rounded-lg hover:bg-indigo-600/10 transition-colors"
            >
              Explore Photos
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-900/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Everything You Need to Share Your Photography
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:bg-gray-700/50 transition-colors">
                <feature.icon className="w-12 h-12 text-indigo-500 mb-4" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Photos Section */}
      <div className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Trending Photography
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading state
              <>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div 
                    key={i} 
                    className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-800 animate-pulse"
                  />
                ))}
              </>
            ) : error ? (
              // Error state
              <div className="col-span-full flex flex-col items-center py-8">
                <ExclamationCircleIcon className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-gray-400">{error}</p>
                <button
                  onClick={fetchFeaturedPhotos}
                  className="mt-4 text-indigo-400 hover:text-indigo-300"
                >
                  Try Again
                </button>
              </div>
            ) : (
              // Success state
              featuredPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/photos/${photo.id}`}
                  className="relative group overflow-hidden rounded-lg"
                >
                  <div className="aspect-[4/3]">
                    <img
                      src={IMAGES_BASE_URL+photo.url}
                      alt={`Photo by ${photo.nickname}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img
                          src={IMAGES_BASE_URL+photo.userProfileImage || '/default-avatar.png'}
                          alt={photo.nickname}
                          className="w-8 h-8 rounded-full border border-white/20"
                        />
                        <span className="text-white font-medium">{photo.nickname}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-900/50 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            What Our Community Says
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-300">{testimonial.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Share Your Photography?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of photographers who are already sharing their work and growing their audience.
          </p>
          <Link href="/signup" className="btn-primary text-lg px-8 py-3">
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}