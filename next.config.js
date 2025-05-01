/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
// next.config.js
module.exports = {
    images: {
        domains: ['pixel-photos-bucket.s3.eu-central-1.amazonaws.com',"images.pexels.com"],

    },
}