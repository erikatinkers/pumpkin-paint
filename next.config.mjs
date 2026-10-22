// The site is a static export served by GitHub Pages at https://<user>.github.io/pumpkin-paint/, so production builds live under that path.
// `npm run dev` stays at the root.
const basePath = process.env.NODE_ENV === "production" ? "/pumpkin-paint" : "";

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, output: "export", basePath };
export default nextConfig;
