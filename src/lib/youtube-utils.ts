/**
 * youtube-utils.ts
 * Utilities for parsing YouTube URLs and fetching video metadata via oEmbed.
 * No API key required.
 */

/** Extracts the 11-character YouTube video ID from various URL formats. */
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
}

/** Fetches basic metadata for a YouTube video using the public oEmbed endpoint. */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      videoId,
      title: data.title ?? "Unknown Title",
      author: data.author_name ?? "Unknown Artist",
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

export function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
