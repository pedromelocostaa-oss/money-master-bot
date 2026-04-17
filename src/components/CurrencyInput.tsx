import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value: string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

function formatToBRL(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  const cents = parseInt(num, 10);
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseFromDisplay(display: string): string {
  if (!display) return '';
  const clean = display.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? '' : num.toString();
}

export default function CurrencyInput({ value, onChange, placeholder = 'R$ 0,00', required, className }: CurrencyInputProps) {
  const formatValue = (v: string) => {
    if (!v) return '';
    const num = parseFloat(v);
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [display, setDisplay] = useState(() => formatValue(value));

  // Sync display when external value changes (e.g. dialog reopens with different record)
  useEffect(() => {
    const currentRaw = parseFromDisplay(display);
    if (currentRaw !== value) {
      setDisplay(formatValue(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatToBRL(raw);
    setDisplay(formatted);
    onChange(parseFromDisplay(formatted));
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display ? `R$ ${display}` : ''}
      onChange={(e) => {
        const stripped = e.target.value.replace('R$ ', '').replace('R$', '');
        handleChange({ ...e, target: { ...e.target, value: stripped } });
      }}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
