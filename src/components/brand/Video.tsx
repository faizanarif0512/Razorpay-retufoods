// Brand videos are served from /public/videos, each with a poster frame so the player never shows black
export default function Video({ src, className = '' }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      poster={src.replace(/\.mp4$/, '.jpg')}
      controls
      playsInline
      preload="none"
      className={`w-full rounded-xl bg-black object-cover ${className}`}
    />
  );
}
