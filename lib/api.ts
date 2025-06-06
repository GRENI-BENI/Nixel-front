// API Base URL - should be configured based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dev.elevensgang.com/api';

// Common headers for all requests
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

// Types
export interface User {
  id: string;
  nickname: string;
  email: string;
  about: string | null;
  profileImage: string | null;
  followersCount: number;
  followingCount: number;
  followedByCurrentUser: boolean;
}


export interface Photo {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  userId: string;
  nickname: string;
  userProfileImage: string | null;
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
  createdAt: string;
}
export interface DonationPlatform {
  id: number;
  name: string;
  icon: string;
  baseUrl: string;
}

export interface UserDonation {
  id: number;
  platformId: number;
  platformName: string;
  platformIcon: string;
  donationLink: string;
}
export interface Comment {
  id: string;
  content: string;
  userId: string;
  photoId: string;
  nickname: string;
  userProfileImage: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Authentication API
export const authApi = {
  // POST /api/iam/auth/login
  // Request body: { email: string, password: string }
  // Response: AuthResponse
  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE_URL}/iam/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Invalid email or password');
    }

    return response.json();
  },

  signup: async (data: { email: string; password: string; nickname: string }) => {
    const response = await fetch(`${API_BASE_URL}/iam/auth/signup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to create account');
    }

    // Login to get the access token
    const authResponse = await authApi.login({
      email: data.email,
      password: data.password
    });

    return  authResponse.accessToken;
  },

  // GET /api/user/me
  // Headers: Authorization: Bearer <token>
  // Response: User
  getCurrentUser: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/me`, {
      headers: {
        ...getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    return response.json();
  },
};

// User API
export const userApi = {
  // GET /api/users/:id
  // Response: User
  getUser: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/${id}`, {
      headers: getHeaders()
    });
    return response.json();
  },

  // GET /api/user/:nickname
  // Response: UserPhoto[]
  getUserPhotos: async (nickname: string) => {
    const response = await fetch(`${API_BASE_URL}/photos/user/${nickname}`, {
      headers: getHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user photos');
    }
    return response.json();
  },

  // PUT /api/user/me/about
  // Request body: { about: string }
  // Response: User
  updateAbout: async (about: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/me/about`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ about }),
    });
    if (!response.ok) {
      throw new Error('Failed to update about text');
    }
    return response.json();
  },

  // POST /api/users/:id/profile-image
  // Request body: FormData with 'image' field
  // Response: { profileImage: string }
  updateProfileImage: async (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/photos/user/profile-image`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: formData,
    });
    return response.json();
  },

  // POST /api/iam/user/:nickname/follow
  // Response: { content: User[], pageable: {...}, totalElements: number, ... }
  followUser: async (nickname: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/${nickname}/follow`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to follow user');
    }
    return response.json();
  },

  // DELETE /api/iam/user/:nickname/follow
  // Response: { content: User[], pageable: {...}, totalElements: number, ... }
  unfollowUser: async (nickname: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/${nickname}/follow`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to unfollow user');
    }
    return response.json();
  },

  // GET /api/iam/user/:nickname/followers
  // Query params: page?: number, size?: number
  // Response: { content: User[], pageable: {...}, totalElements: number, ... }
  getFollowers: async (nickname: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_BASE_URL}/iam/user/${nickname}/followers?${queryParams}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch followers');
    }
    return response.json();
  },

  // GET /api/iam/user/:nickname/following
  // Query params: page?: number, size?: number
  // Response: { content: User[], pageable: {...}, totalElements: number, ... }
  getFollowing: async (nickname: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_BASE_URL}/iam/user/${nickname}/following?${queryParams}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch following users');
    }
    return response.json();
  },

  // GET /api/iam/platforms
  // Response: DonationPlatform[]
  getDonationPlatforms: async (): Promise<DonationPlatform[]> => {
    const response = await fetch(`${API_BASE_URL}/iam/platforms`, {
      headers: getHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch donation platforms');
    }
    return response.json();
  },

  // GET /api/iam/user/me/donations
  // Response: UserDonation[]
  getUserDonations: async (): Promise<UserDonation[]> => {
    const response = await fetch(`${API_BASE_URL}/iam/user/me/donations`, {
      headers: getHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user donations');
    }
    return response.json();
  },

  // POST /api/iam/user/me/donations
  // Request body: { platformId: number, donationLink: string }
  // Response: UserDonation[]
  addDonationLink: async (platformId: number, donationLink: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/me/donations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ platformId, donationLink }),
    });
    if (!response.ok) {
      throw new Error('Failed to add donation link');
    }
    return response.json();
  },

  // DELETE /api/iam/user/me/donations/:id
  // Response: void
  deleteDonationLink: async (donationId: number) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/me/donations/${donationId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete donation link');
    }
    return response.json();
  },

  getUserDonationsById: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/iam/user/${userId}/donations-by-id`, {
      headers: getHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user donations');
    }
    return response.json();
  }
};

// Photos API
export const photoApi = {
  // POST /api/photos/list
  // Request body: { page?: number, size?: number, userId?: string, tags?: [] }
  // Response: { photos: Photo[], totalCount: number }
  getPhotos: async (params: {
    page?: number;
    size?: number;
    userId?: string;
    tags?: [];
  }) => {
    const response = await fetch(`${API_BASE_URL}/photos/list`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return response.json();
  },

  // GET /api/photos/trending
  // Query params: page?: number, size?: number
  // Response: { photos: Photo[], totalCount: number }
  getTrendingPhotos: async (params: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_BASE_URL}/photos/trending?${queryParams}`, {
      headers: getHeaders()
    });
    return response.json();
  },

  getPhotosByTag: async (params: { page?: number; size?: number; tags: string[] }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_BASE_URL}/photos/tags?${queryParams}`, {
      headers: getHeaders()
    });
    return response.json();
  },

  // GET /api/photos/:id
  // Response: Photo
  getPhoto: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}`, {
      headers: getHeaders()
    });
    return response.json();
  },

  // POST /api/photos
  // Request body: FormData with 'image', 'title', 'description', 'tags' fields
  // Response: Photo
  uploadPhoto: async (data: {
    image: File;
    title: string;
    description: string;
    tags: string[];
  }) => {
    const formData = new FormData();
    formData.append('image', data.image);
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('tags', JSON.stringify(data.tags)); // Format tags as JSON string

    const response = await fetch(`${API_BASE_URL}/photos/upload`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {})
      },
      body: formData,
    });
    return response.json();
  },

  // PUT /api/photos/:id
  // Request body: { title?: string, description?: string, tags?: string[] }
  // Response: Photo
  updatePhoto: async (id: string, data: {
    title?: string;
    description?: string;
    tags?: string[];
  }) => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // DELETE /api/photos/:id
  // Response: { success: true }
  deletePhoto: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  // POST /api/photos/:id/like
  // Response: { likes: number, isLiked: boolean }
  likePhoto: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}/like`, {
      method: 'POST',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to like photo: ${response.status}${text ? ` - ${text}` : ''}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format: expected JSON');
    }

    return response.json();
  },

  // DELETE /api/photos/:id/like
  // Response: { likes: number, isLiked: boolean }
  unlikePhoto: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/photos/${id}/like`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to unlike photo: ${response.status}${text ? ` - ${text}` : ''}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format: expected JSON');
    }

    return response.json();
  },

  getTags: async () => {
    const response = await fetch(`${API_BASE_URL}/tags`, {
      headers: getHeaders()
    });
    return response.json();
  },
};

// Comments API
export const commentApi = {
  // GET /api/photos/:photoId/comments
  // Query params: page?: number, size?: number
  // Response: { comments: Comment[], totalCount: number }
  getComments: async (photoId: string, params?: { page?: number; size?: number }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(
        `${API_BASE_URL}/comments/${photoId}?${queryParams}`,
        {
          headers: getHeaders()
        }
    );
    return response.json();
  },

  // POST /api/photos/:photoId/comments
  // Request body: { content: string }
  // Response: Comment
  createComment: async (photoId: string, data: { content: string }) => {
    const response = await fetch(`${API_BASE_URL}/comments/${photoId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // DELETE /api/comments/:id
  // Response: { success: true }
  deleteComment: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/comments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  // GET /api/photos/comments/count/user
  // Response: { totalCommentsCount: number }
  getUserCommentsCount: async () => {
    const response = await fetch(`${API_BASE_URL}/photos/comments/count/user`, {
      headers: getHeaders()
    });
    return response.json();
  },
};