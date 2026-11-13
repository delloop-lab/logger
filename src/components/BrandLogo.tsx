type BrandLogoProps = {
  /** Visual size preset */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** When false, render the image only (no home link). Default links to landing `/`. */
  linkHome?: boolean;
};

const SIZE = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-11 md:h-12',
} as const;

/** Logger mark + wordmark (transparent PNG, wood-tone planks). */
export default function BrandLogo({ size = 'md', className = '', linkHome = true }: BrandLogoProps) {
  const img = (
    <img
      src="/brand/logger-logo.png"
      alt="Logger"
      className={`block w-auto ${SIZE[size]} ${className}`.trim()}
      draggable={false}
    />
  );

  if (!linkHome) return img;

  return (
    <a
      href="/"
      aria-label="Logger home"
      data-home-link
      className="inline-block shrink-0"
    >
      {img}
    </a>
  );
}
