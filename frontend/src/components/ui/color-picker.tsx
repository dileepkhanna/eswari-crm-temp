import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ─── Color Conversion Utilities ───────────────────────────────────────────────

function hslToHex(hsl: string): string {
  const parts = hsl.replace(/,/g, ' ').split(/\s+/).map(p => parseFloat(p));
  if (parts.length < 3 || parts.some(isNaN)) return '#3b82f6';
  const [h, s, l] = parts;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '215 80% 35%';
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgb(59, 130, 246)';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)/);
  if (!match) return '#3b82f6';
  const r = Math.min(255, parseInt(match[1]));
  const g = Math.min(255, parseInt(match[2]));
  const b = Math.min(255, parseInt(match[3]));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Detect the format of a color string */
function detectFormat(value: string): 'hex' | 'rgb' | 'hsl' {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('#') || /^[a-f0-9]{3,8}$/i.test(trimmed)) return 'hex';
  if (trimmed.startsWith('rgb')) return 'rgb';
  return 'hsl';
}

/** Convert any supported color string to hex */
function toHex(value: string): string {
  const format = detectFormat(value);
  if (format === 'hex') {
    let hex = value.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    // Expand shorthand (#abc → #aabbcc)
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex.length === 7 ? hex : '#3b82f6';
  }
  if (format === 'rgb') return rgbToHex(value);
  return hslToHex(value);
}

// ─── Color Format Type ────────────────────────────────────────────────────────

type ColorFormat = 'hex' | 'rgb' | 'hsl';

// ─── ColorPickerField Component ───────────────────────────────────────────────

interface ColorPickerFieldProps {
  label: string;
  value: string; // stored as HSL (e.g. "215 80% 35%") or HEX
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ColorPickerField({ label, value, onChange, placeholder }: ColorPickerFieldProps) {
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert stored value to hex for the picker
  const hexValue = toHex(value || '#3b82f6');

  // Update the displayed input value when the stored value or format changes
  useEffect(() => {
    const hex = toHex(value || '#3b82f6');
    switch (format) {
      case 'hex':
        setInputValue(hex);
        break;
      case 'rgb':
        setInputValue(hexToRgb(hex));
        break;
      case 'hsl':
        setInputValue(hexToHsl(hex));
        break;
    }
  }, [value, format]);

  const handlePickerChange = useCallback((newHex: string) => {
    // Store as HSL internally (for CSS variable compatibility)
    onChange(hexToHsl(newHex));
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleInputBlur = () => {
    // Try to parse the input and update the stored value
    try {
      const hex = toHex(inputValue);
      if (/^#[a-f0-9]{6}$/i.test(hex)) {
        onChange(hexToHsl(hex));
      }
    } catch {
      // Invalid input, revert
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {/* Color swatch + input */}
        <div className="flex gap-2 items-center">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-12 h-10 rounded-md border-2 border-input cursor-pointer shrink-0 transition-all hover:border-primary hover:scale-105"
                style={{ backgroundColor: hexValue }}
                title="Click to open color picker"
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start" sideOffset={8}>
              <div className="space-y-3">
                <HexColorPicker color={hexValue} onChange={handlePickerChange} />
                <div className="text-xs text-muted-foreground text-center">
                  {hexValue.toUpperCase()}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder || '#3b82f6'}
            className="flex-1 min-w-0 font-mono text-sm"
          />
        </div>

        {/* Format toggle */}
        <div className="flex gap-1">
          {(['hex', 'rgb', 'hsl'] as ColorFormat[]).map((f) => (
            <Button
              key={f}
              type="button"
              variant={format === f ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs uppercase"
              onClick={() => setFormat(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
