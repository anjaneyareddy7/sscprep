export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/\/(embed|shorts|live|v)\/([^/?#]+)/);
      if (m) return m[2];
    }
  } catch {
    const m = url.match(/^[a-zA-Z0-9_-]{11}$/);
    if (m) return url;
  }
  return null;
}

export function youtubeThumb(videoId: string, q: "hq" | "mq" | "max" = "hq"): string {
  const map = { hq: "hqdefault", mq: "mqdefault", max: "maxresdefault" } as const;
  return `https://img.youtube.com/vi/${videoId}/${map[q]}.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export interface YouTubeMeta {
  title?: string;
  channel?: string;
  thumbnail?: string;
}

/** Fetches title + author via noembed (CORS-friendly proxy for YouTube oEmbed). */
export async function fetchYouTubeMeta(url: string): Promise<YouTubeMeta> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data.error) return {};
    return {
      title: data.title,
      channel: data.author_name,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return {};
  }
}
