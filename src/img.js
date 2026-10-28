// Resolves a file in public/images against the build's base path,
// so images work both on a normal host and in the shareable build.
export const img = (file) => `${import.meta.env.BASE_URL}images/${file}`;
