import { PlmccMark } from '@/components/PlmccMark';

type WordmarkProps = {
  size?: number;
  color?: string;
  className?: string;
};

export function PlmccWordmark({ size = 36, color = '#E58430', className }: WordmarkProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        color,
        lineHeight: 1,
      }}
      aria-label="PLMCC"
    >
      <span style={{
        fontFamily: "'Nunito', sans-serif",
        fontWeight: 900,
        fontSize: size,
        letterSpacing: '-0.5px',
      }}>
        Plm
      </span>
      <PlmccMark
        size={Math.round(size * 0.42)}
        style={{
          marginLeft: Math.round(size * 0.08),
          marginBottom: Math.round(size * 0.18),
          flexShrink: 0,
        }}
      />
    </div>
  );
}
