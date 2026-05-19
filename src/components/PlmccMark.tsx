import React from 'react';

type PlmccMarkProps = React.SVGProps<SVGSVGElement> & { size?: number };

export function PlmccMark({ size = 32, ...props }: PlmccMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-label="PLMCC"
      {...props}
    >
      <path d="M 50 6 Q 92 11 95 50 Q 92 89 50 94 Q 8 89 5 50 Q 8 11 50 6 Z" strokeWidth={4} />
      <path d="M 45 36 Q 28 36 28 50 Q 28 64 45 64" strokeWidth={7} />
      <path d="M 72 36 Q 55 36 55 50 Q 55 64 72 64" strokeWidth={7} />
    </svg>
  );
}
