'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, UserCircleIcon, BookOpenIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { authApi, type User } from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL;

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const luser= localStorage.getItem('user');
      if (!luser) {
        if(token){
        try {
          const freshUserData = await authApi.getCurrentUser(token);
          setUser(freshUserData);
          localStorage.setItem('user', JSON.stringify(freshUserData));
        } catch (error) {
          console.error('Failed to get user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
        }
      } else {
        setUser(JSON.parse(luser));
      }
      setIsLoading(false);
    };

    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          setUser(null);
        } else {
          checkAuth();
        }
      }
    };

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChange', handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/favicon.ico"
                alt="PhotoShare Logo"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-xl font-bold text-white">PhotoShare</span>
            </Link>
            <Link href="/discover" className="text-gray-300 hover:text-white">
              Discover
            </Link>
          </div>

          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search photos, categories, or tags..."
                className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {!isLoading && (user ? (
              <>
                <Link href="/library" className="flex items-center space-x-2 text-gray-300 hover:text-white">
                  <PhotoIcon className="h-5 w-5" />
                  <span>My Library</span>
                </Link>
                <Link href="/upload" className="btn-primary">
                  Upload
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-white hover:text-indigo-400">
                    {user.profileImage ? (
                      <img
                        src={IMAGES_BASE_URL + user.profileImage}
                        alt={user.nickname}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircleIcon className="h-8 w-8" />
                    )}
                    <span>{user.nickname}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      href={`/profile/${user.id}`}
                      className="block px-4 py-2 text-white hover:bg-gray-700"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/library"
                      className="flex items-center px-4 py-2 text-white hover:bg-gray-700"
                    >
                      <BookOpenIcon className="w-5 h-5 mr-2" />
                      My Library
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-white hover:text-indigo-400">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}