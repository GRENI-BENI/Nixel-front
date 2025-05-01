'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCircleIcon, PhotoIcon, PencilIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { HeartIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { userApi, photoApi, type User, type Photo } from '@/lib/api';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL || 'https://pixel-photos-bucket.s3.eu-central-1.amazonaws.com';

export default function ProfilePage({ params }: { params: { id: string } }) {
    const { id } = params;
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [about, setAbout] = useState('');
    const [isCurrentUser, setIsCurrentUser] = useState(false);
    const [followers, setFollowers] = useState<User[]>([]);
    const [following, setFollowing] = useState<User[]>([]);
    const [followersPage, setFollowersPage] = useState(0);
    const [followingPage, setFollowingPage] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [donationPlatforms, setDonationPlatforms] = useState<any[]>([]);
    const [userDonations, setUserDonations] = useState<any[]>([]);
    const [isAddingDonation, setIsAddingDonation] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<number | null>(null);
    const [donationLink, setDonationLink] = useState('');

    useEffect(() => {
        const checkCurrentUser = () => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            setIsCurrentUser(currentUser.id == id);
        };
        checkCurrentUser();
    }, [id]);

    useEffect(() => {
        fetchUserData();
        fetchDonationPlatforms();
    }, [id]);

    const fetchUserData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const userData = await userApi.getUser(id);
            setUser(userData);
            setAbout(userData.about || '');
            setIsFollowing(userData.followedByCurrentUser);

            // Prepare API calls based on authentication status
            const apiCalls = [
                userApi.getUserPhotos(userData.nickname),
                userApi.getFollowers(userData.nickname, { page: 0, size: 5 }),
            ];

            // Only fetch following if user is authenticated and viewing their own profile
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isAuthenticated = !!localStorage.getItem('token');
            const isOwnProfile = currentUser.id == id;

            if (isAuthenticated && isOwnProfile) {
                apiCalls.push(userApi.getFollowing(userData.nickname, { page: 0, size: 5 }));
            }

            // Always fetch donations
            apiCalls.push(userApi.getUserDonationsById(userData.id));

            // Execute API calls
            const results = await Promise.all(apiCalls);

            // Set data based on API call results
            setPhotos(results[0].content);
            setFollowers(results[1].content);

            if (isAuthenticated && isOwnProfile) {
                // Following data is at index 2 if it was included
                setFollowing(results[2].content);
                // Donations data is at index 3
                setUserDonations(results[3]);
            } else {
                // Donations data is at index 2 if following wasn't included
                setFollowing([]); // Set empty following array
                setUserDonations(results[2]);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            setError('Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDonationPlatforms = async () => {
        try {
            const platforms = await userApi.getDonationPlatforms();
            setDonationPlatforms(platforms);
        } catch (error) {
            console.error('Error fetching donation platforms:', error);
        }
    };

    const fetchUserDonations = async () => {
        if (!user) return;
        try {
            const donations = await userApi.getUserDonationsById(user.id);
            setUserDonations(donations);
        } catch (error) {
            console.error('Error fetching user donations:', error);
        }
    };

    const handleAddDonation = async () => {
        if (!selectedPlatform || !donationLink) return;
        try {
            await userApi.addDonationLink(selectedPlatform, donationLink);
            await fetchUserDonations();
            setIsAddingDonation(false);
            setSelectedPlatform(null);
            setDonationLink('');
        } catch (error) {
            console.error('Error adding donation link:', error);
        }
    };

    const handleDeleteDonation = async (donationId: number) => {
        try {
            await userApi.deleteDonationLink(donationId);
            await fetchUserDonations();
        } catch (error) {
            console.error('Error deleting donation link:', error);
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
                        likedByCurrentUser: !photo.likedByCurrentUser,
                        likesCount: photo.likedByCurrentUser ? photo.likesCount - 1 : photo.likesCount + 1
                    }
                    : photo
            ));
        } catch (error) {
            console.error('Error updating like:', error);
        }
    };

    const handleFollow = async () => {
        if (!user) return;

        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            let response;
            if (isFollowing) {
                response = await userApi.unfollowUser(user.nickname);
            } else {
                response = await userApi.followUser(user.nickname);
            }

            // Update the user state with the response data
            setUser(prev => prev ? { ...prev, ...response } : null);
            // Update isFollowing based on the response
            setIsFollowing(response.followedByCurrentUser);
        } catch (error) {
            console.error('Error following/unfollowing user:', error);
        }
    };

    const fetchFollowers = async (page: number = 0) => {
        if (!user) return;
        try {
            const response = await userApi.getFollowers(user.nickname, { page, size: 5 });
            if (page === 0) {
                setFollowers(response.content);
            } else {
                setFollowers(prev => [...prev, ...response.content]);
            }
            setFollowersPage(page);
        } catch (error) {
            console.error('Error fetching followers:', error);
        }
    };

    const fetchFollowing = async (page: number = 0) => {
        if (!user) return;
        try {
            const response = await userApi.getFollowing(user.nickname, { page, size: 5 });
            if (page === 0) {
                setFollowing(response.content);
            } else {
                setFollowing(prev => [...prev, ...response.content]);
            }
            setFollowingPage(page);
        } catch (error) {
            console.error('Error fetching following:', error);
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
                                    <Image
                                        src={IMAGES_BASE_URL + user.profileImage}
                                        alt={user.nickname}
                                        width={128}
                                        height={128}
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
                                <Image
                                    src={IMAGES_BASE_URL + user.profileImage}
                                    alt={user.nickname}
                                    width={128}
                                    height={128}
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

                    <div className="flex justify-between items-center mb-6">
                        <div className="flex justify-center md:justify-start gap-8">
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

                        <div className="flex items-center gap-4">
                            {/* Donation Links Section */}
                            <div className="relative">
                                <div className="flex items-center gap-2">
                                    {userDonations.map((donation) => (
                                        <div key={donation.id} className="relative group">
                                            <a
                                                href={donation.donationLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                <Image
                                                    src={IMAGES_BASE_URL + donation.platformIcon}
                                                    alt={donation.platformName}
                                                    width={20}
                                                    height={20}
                                                    className="w-5 h-5 object-contain rounded-full"
                                                />
                                                <span className="text-sm">{donation.platformName}</span>
                                            </a>
                                            {isCurrentUser && (
                                                <button
                                                    onClick={() => handleDeleteDonation(donation.id)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                    title="Delete donation link"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {isCurrentUser && (
                                        <button
                                            onClick={() => setIsAddingDonation(!isAddingDonation)}
                                            className="flex items-center gap-2 bg-indigo-600/50 px-3 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                                        >
                                            <span className="text-sm">Add Platform</span>
                                        </button>
                                    )}
                                </div>

                                {/* Add Donation Platform Modal */}
                                {isAddingDonation && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 rounded-lg shadow-lg p-4 z-10">
                                        <h3 className="text-lg font-semibold mb-4">Add Donation Platform</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                                    Platform
                                                </label>
                                                <div className="space-y-2">
                                                    {donationPlatforms.map((platform) => (
                                                        <div
                                                            key={platform.id}
                                                            onClick={() => setSelectedPlatform(platform.id)}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                                                selectedPlatform === platform.id
                                                                    ? 'bg-indigo-600/50 hover:bg-indigo-600'
                                                                    : 'bg-gray-700/50 hover:bg-gray-700'
                                                            }`}
                                                        >
                                                            <Image
                                                                src={IMAGES_BASE_URL + platform.icon}
                                                                alt={platform.name}
                                                                width={24}
                                                                height={24}
                                                                className="w-6 h-6 object-contain rounded-full"
                                                            />
                                                            <span className="font-medium">{platform.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                                    Profile Link
                                                </label>
                                                <input
                                                    type="text"
                                                    value={donationLink}
                                                    onChange={(e) => setDonationLink(e.target.value)}
                                                    placeholder="Enter your profile link"
                                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsAddingDonation(false);
                                                        setSelectedPlatform(null);
                                                        setDonationLink('');
                                                    }}
                                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddDonation}
                                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isCurrentUser && (
                                <button
                                    onClick={handleFollow}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                        isFollowing
                                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                                >
                                    {isFollowing ? 'Unfollow' : 'Follow'}
                                </button>
                            )}
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

                        {/* Following Section */}
                        {isCurrentUser && (
                            <div className="mt-6 space-y-4">
                                <div className="bg-gray-800/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold">Following</h3>
                                        <span className="text-sm text-gray-400">{user.followingCount} users</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                            {following.map((followed) => (
                                                <Link
                                                    key={followed.id}
                                                    href={`/profile/${followed.id}`}
                                                    className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
                                                >
                                                    {followed.profileImage ? (
                                                        <Image
                                                            src={IMAGES_BASE_URL + followed.profileImage}
                                                            alt={followed.nickname}
                                                            width={24}
                                                            height={24}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <UserCircleIcon className="w-6 h-6 text-gray-400" />
                                                    )}
                                                    <span className="text-sm whitespace-nowrap">{followed.nickname}</span>
                                                </Link>
                                            ))}
                                            {following.length === 0 && (
                                                <p className="text-gray-400 text-sm">Not following anyone yet</p>
                                            )}
                                        </div>
                                        {user.followingCount > following.length && (
                                            <button
                                                onClick={() => fetchFollowing(followingPage + 1)}
                                                className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex-shrink-0"
                                            >
                                                Load More
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Followers Section */}
                        <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold">Followers</h3>
                                <span className="text-sm text-gray-400">{user.followersCount} users</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                    {followers.map((follower) => (
                                        <Link
                                            key={follower.id}
                                            href={`/profile/${follower.id}`}
                                            className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
                                        >
                                            {follower.profileImage ? (
                                                <Image
                                                    src={IMAGES_BASE_URL + follower.profileImage}
                                                    alt={follower.nickname}
                                                    width={24}
                                                    height={24}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                            ) : (
                                                <UserCircleIcon className="w-6 h-6 text-gray-400" />
                                            )}
                                            <span className="text-sm whitespace-nowrap">{follower.nickname}</span>
                                        </Link>
                                    ))}
                                    {followers.length === 0 && (
                                        <p className="text-gray-400 text-sm">No followers yet</p>
                                    )}
                                </div>
                                {user.followersCount > followers.length && (
                                    <button
                                        onClick={() => fetchFollowers(followersPage + 1)}
                                        className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex-shrink-0"
                                    >
                                        Load More
                                    </button>
                                )}
                            </div>
                        </div>
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
                            <PhotoIcon className="w-5 h-5" />
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
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4">
                        {photos.map((photo) => (
                            <Link
                                key={photo.id}
                                href={`/photos/${photo.id}`}
                                className="relative block mb-4 break-inside-avoid group"
                            >
                                <div className="relative overflow-hidden rounded-lg">
                                    <Image
                                        src={IMAGES_BASE_URL + photo.url}
                                        alt={`Photo by ${photo.nickname}`}
                                        width={800}
                                        height={600}
                                        className="w-full h-auto object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Image
                                                        src={IMAGES_BASE_URL + photo.userProfileImage || '/default-avatar.png'}
                                                        alt={photo.nickname}
                                                        width={32}
                                                        height={32}
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

                                    {/* Mobile info section - only visible on small screens */}
                                    <div className="sm:hidden mt-2 px-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Image
                                                    src={IMAGES_BASE_URL + photo.userProfileImage || '/default-avatar.png'}
                                                    alt={photo.nickname}
                                                    width={24}
                                                    height={24}
                                                    className="w-6 h-6 rounded-full border border-white/20"
                                                />
                                                <span className="text-white text-sm font-medium truncate max-w-[100px]">{photo.nickname}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <span className="text-white text-sm">{photo.likesCount}</span>
                                                <button
                                                    onClick={(e) => handleLike(photo.id, e)}
                                                >
                                                    {photo.likedByCurrentUser ? (
                                                        <HeartSolidIcon className="w-5 h-5" />
                                                    ) : (
                                                        <HeartIcon className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {isCurrentUser && (
                <div className="mt-12 text-center">
                    <Link
                        href="/library"
                        className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                    >
                        <BookOpenIcon className="w-5 h-5" />
                        <span>Manage your photos in Library</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
