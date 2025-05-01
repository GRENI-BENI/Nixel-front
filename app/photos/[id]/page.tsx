'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {HeartIcon, ShareIcon, LinkIcon, TagIcon, ChatBubbleLeftIcon} from '@heroicons/react/24/outline';
import {HeartIcon as HeartSolidIcon} from '@heroicons/react/24/solid';
import {photoApi, commentApi, type Photo, type Comment, userApi} from '@/lib/api';
import {use} from 'react';

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL || 'https://pixel-photos-bucket.s3.eu-central-1.amazonaws.com';

export default function PhotoPage({params}: { params: { id: string } }) {
    const router = useRouter();
    const {id} = params;
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [similarPhotos, setSimilarPhotos] = useState<Photo[]>([]);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showCopied, setShowCopied] = useState(false);
    const [isLabelFading, setIsLabelFading] = useState(false);
    const [userDonations, setUserDonations] = useState<any[]>([]);

    useEffect(() => {
        fetchPhotoData();
    }, [id]);

    const fetchPhotoData = async () => {
        try {
            setIsLoading(true);
            const [photoData, commentsData] = await Promise.all([
                photoApi.getPhoto(id),
                commentApi.getComments(id)
            ]);
            const [similarData, donationsData] = await Promise.all([
                photoApi.getPhotosByTag({page: 0, size: 6, tags: photoData?.tags[0]}),
                userApi.getUserDonationsById(photoData.userId)
            ]);
            setPhoto(photoData);
            setComments(commentsData.content);
            setSimilarPhotos(similarData.content.filter((p: Photo) => p.id !== id));
            setUserDonations(donationsData);
        } catch (error) {
            console.error('Error fetching photo data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLike = async () => {
        if (!photo) return;

        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            photo.likedByCurrentUser
                ? await photoApi.unlikePhoto(photo.id)
                : await photoApi.likePhoto(photo.id);

            setPhoto(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    likedByCurrentUser: !prev.likedByCurrentUser,
                    likesCount: prev.likedByCurrentUser ? prev.likesCount - 1 : prev.likesCount + 1
                };
            });
        } catch (error) {
            console.error('Error updating like:', error);
        }
    };

    const handleShare = async () => {
        try {
            await navigator.share({
                title: `Photo by ${photo?.nickname}`,
                url: window.location.href,
            });
        } catch (error) {
            handleCopyLink();
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShowCopied(true);
            setIsLabelFading(false);

            setTimeout(() => {
                setIsLabelFading(true);
            }, 1800);

            setTimeout(() => {
                setShowCopied(false);
                setIsLabelFading(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!photo || !comment.trim()) return;

        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const newComment = await commentApi.createComment(photo.id, {content: comment});

            const commentWithUser = {
                ...newComment,
                nickname: user.nickname,
                userProfileImage: user.profileImage
            };

            setComments(prev => [commentWithUser, ...prev]);
            setComment('');
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    };

    if (isLoading || !photo) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
                <div className="space-y-6">
                    {photo.title && (
                        <h1 className="text-3xl font-bold text-white">{photo.title}</h1>
                    )}
                    <div className="relative rounded-lg overflow-hidden">
                        <Image
                            src={IMAGES_BASE_URL + photo.url}
                            alt={photo.title || `Photo by ${photo.nickname}`}
                            width={1200}
                            height={800}
                            className="w-full object-contain"
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 text-white transition-colors ${
                                photo.likedByCurrentUser ? 'text-pink-500' : 'hover:text-pink-500'
                            }`}
                        >
                            {photo.likedByCurrentUser ? (
                                <HeartSolidIcon className="w-6 h-6"/>
                            ) : (
                                <HeartIcon className="w-6 h-6"/>
                            )}
                            <span className="font-semibold">{photo.likesCount} likes</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-white hover:text-indigo-400 transition-colors"
                        >
                            <ShareIcon className="w-6 h-6"/>
                            Share
                        </button>
                        <div className="relative">
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-2 text-white hover:text-indigo-400 transition-colors"
                            >
                                <LinkIcon className="w-6 h-6"/>
                                Copy Link
                            </button>
                            {showCopied && (
                                <div
                                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap ${isLabelFading ? 'animate-fade-out' : 'animate-fade-up'}`}>
                                    Link copied!
                                </div>
                            )}
                        </div>
                    </div>

                    {photo.description && (
                        <p className="text-gray-300">{photo.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <TagIcon className="w-5 h-5 text-gray-400"/>
                        {photo.tags.map(tag => (
                            <Link
                                key={tag}
                                href={`/discover?tag=${tag}`}
                                className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors"
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    {/*<div className="flex items-center gap-4">*/}
                    {/*  <Image*/}
                    {/*      src={IMAGES_BASE_URL+photo.userProfileImage || '/default-avatar.png'}*/}
                    {/*      alt={photo.nickname}*/}
                    {/*      width={48}*/}
                    {/*      height={48}*/}
                    {/*      className="w-12 h-12 rounded-full"*/}
                    {/*  />*/}
                    {/*  <div className="flex-1">*/}
                    {/*    <h2 className="font-semibold">{photo.nickname}</h2>*/}
                    {/*    <Link*/}
                    {/*        href={`/profile/${photo.userId}`}*/}
                    {/*        className="text-sm text-indigo-400 hover:text-indigo-300"*/}
                    {/*    >*/}
                    {/*      Explore Photos*/}
                    {/*    </Link>*/}
                    {/*  </div>*/}
                    {/*</div>*/}

                    <Link
                        href={`/profile/${photo?.id}`}
                        className="flex items-center space-x-2 group hover:bg-gray-50 rounded-full p-2 transition-all duration-200 transform hover:scale-105"
                        title={`View ${photo?.nickname}'s profile`}
                    >
                        <div
                            className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 group-hover:border-indigo-300 transition-colors">
                            {photo?.userProfileImage ? (
                                <Image
                                    src={`${IMAGES_BASE_URL}${photo.userProfileImage}`}
                                    alt={photo?.nickname || 'User'}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                                    {photo?.nickname?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-white group-hover:text-indigo-600 transition-colors">
                              {photo?.nickname}
                            </span>
                            <span className="text-xs text-gray-500">View profile</span>
                        </div>
                    </Link>

                    {/* Donation Platforms Section */}
                    {userDonations.length > 0 && (
                        <div className="flex items-center gap-2 mt-4" key="donations-container">
                            {userDonations.map((donation) => (
                                <a
                                    key={donation.id}
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
                            ))}
                        </div>
                    )}

                    <div className="space-y-4" key="comments-container">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-semibold">Comments</h3>
                            <div className="flex items-center gap-2 text-gray-400">
                                <ChatBubbleLeftIcon className="w-5 h-5"/>
                                <span>{comments.length}</span>
                            </div>
                        </div>

                        <form onSubmit={handleComment} className="space-y-2">
              <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                disabled={!comment.trim()}
                            >
                                Post Comment
                            </button>
                        </form>

                        <div className="space-y-4" key="comments-list">
                            {comments.map(comment => (
                                <div key={`${comment.userId}-${comment.createdAt}`} className="flex gap-3">
                                    <Image
                                        src={IMAGES_BASE_URL + comment.userProfileImage || '/default-avatar.png'}
                                        alt={comment.nickname}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{comment.nickname}</span>
                                            <span className="text-sm text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                                        </div>
                                        <p className="text-gray-300">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12">
                <h3 className="text-2xl font-semibold mb-6">Similar Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" key="similar-photos-container">
                    {similarPhotos.map(photo => (
                        <Link
                            key={photo.id}
                            href={`/photos/${photo.id}`}
                            className="relative aspect-square group overflow-hidden rounded-lg"
                        >
                            <Image
                                src={IMAGES_BASE_URL + photo.url}
                                alt="Similar photo"
                                width={300}
                                height={300}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <div className="text-white text-sm">❤️ {photo.likesCount}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
