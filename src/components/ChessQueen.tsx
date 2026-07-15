import type { SVGProps } from "react";

interface ChessQueenProps extends SVGProps<SVGSVGElement> {
  size?: number;
  animated?: boolean;
}

export function ChessQueen({ size = 24, animated = false, className = "", ...props }: ChessQueenProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 45 45"
      className={className}
      {...props}
      style={{
        animation: animated ? "pulse 2s ease-in-out infinite" : undefined,
        ...props.style,
      }}
    >
      <g
        fill="currentColor"
        fillRule="evenodd"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 8,12 A 2,2 0 1 1  4,12 A 2,2 0 1 1  8,12 M 24.5,7.5 A 2,2 0 1 1  20.5,7.5 A 2,2 0 1 1  24.5,7.5 M 41,12 A 2,2 0 1 1  37,12 A 2,2 0 1 1  41,12 M 10.5,20 A 2,2 0 1 1  6.5,20 A 2,2 0 1 1  10.5,20 M 38.5,20 A 2,2 0 1 1  34.5,20 A 2,2 0 1 1  38.5,20" />
        <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 24.5,10 L 18,25 L 10.5,13.5 L 9,26 z" />
        <path d="M 9,26 C 9,28 10.5,30 12.5,30 L 32.5,30 C 34.5,30 36,28 36,26" />
        <path d="M 11,14 L 33,14" />
        <path d="M 12.5,30 L 32.5,30 L 32.5,37.5 L 12.5,37.5 z" />
        <path d="M 11.5,37.5 L 33.5,37.5" />
      </g>
    </svg>
  );
}
