// Frontend only: everything is baked at build time and served as static assets
// from the Worker. There is no server-side logic anywhere in this app.
export const prerender = true;
export const ssr = false;
