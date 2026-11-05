type BrandLogoProps = {
  /** Visual size preset */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-11 md:h-12',
} as const;

/** Logger mark + wordmark (transparent PNG, wood-tone planks). */
export default function BrandLogo({ size = 'md', className = '' }: BrandLogoProps) {
  return (
    <img
      src="/brand/logger-logo.png"
      alt="Logger"
      className={`block w-auto ${SIZE[size]} ${className}`.trim()}
      draggable={false}
    />
  );
}
