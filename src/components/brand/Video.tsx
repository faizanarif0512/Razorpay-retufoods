// Brand videos are served from /public/videos, so the site doesn't depend on Squarespace
export default function Video({ src, className = '' }: { src: string; className?: string }) {
  return <video src={src} controls playsInline preload="metadata" className={`w-full rounded-xl bg-black object-cover ${className}`} />;
}
