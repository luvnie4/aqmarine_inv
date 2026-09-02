import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'horizontal' | 'card' | 'icon-only';
  showText?: boolean;
  textColor?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showText = true,
  textColor = 'text-slate-800',
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 'w-10 h-10', text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-24 h-24', text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // The Exact Monogram Emblem from the uploaded Aqmarine.png
  const AqmarineEmblem = ({ strokeColor = '#E2C8C6', strokeWidth = 11 }: { strokeColor?: string; strokeWidth?: number }) => (
    <svg 
      viewBox="0 0 200 200" 
      className="w-full h-full" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Right Circular Loop of 'Q' / intertwine */}
      <circle 
        cx="114" 
        cy="94" 
        r="38" 
        stroke={strokeColor} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
      />
      
      {/* Left 'A' arch & bowl transitioning seamlessly down the center spine and curving right to form the elegant tail */}
      <path
        d="M 80 132 C 54 132, 44 112, 44 94 C 44 68, 62 56, 80 56 C 98 56, 114 68, 114 94 L 114 132 C 114 143, 122 148, 134 148"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Variant 1: Card badge matching the exact uploaded image (dusty rose background with cream emblem & text underneath)
  if (variant === 'card') {
    return (
      <div className={`bg-[#9D6C72] text-[#E2C8C6] rounded-2xl p-6 flex flex-col items-center justify-center shadow-lg border border-[#8C5B61] ${className}`}>
        <div className="w-24 h-24 mb-3">
          <AqmarineEmblem strokeColor="#E2C8C6" strokeWidth={11} />
        </div>
        <span className="font-extrabold tracking-[0.28em] text-xl text-[#E2C8C6] font-sans uppercase">
          AQMARINE
        </span>
        <span className="text-[10px] tracking-[0.2em] text-[#E2C8C6]/80 uppercase mt-0.5">
          Hijab & Mukena
        </span>
      </div>
    );
  }

  // Variant 2: Icon Only
  if (variant === 'icon-only') {
    return (
      <div
        className={`${currentSize.icon} rounded-xl bg-[#9D6C72] flex items-center justify-center text-[#E2C8C6] shadow-md shadow-[#9D6C72]/25 shrink-0 p-1.5 ${className}`}
        title="AQMARINE"
      >
        <AqmarineEmblem strokeColor="#E2C8C6" strokeWidth={11} />
      </div>
    );
  }

  // Variant 3: Horizontal layout for navbar and headers
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Box */}
      <div
        className={`${currentSize.icon} rounded-xl bg-[#9D6C72] flex items-center justify-center text-[#E2C8C6] shadow-md shadow-[#9D6C72]/25 shrink-0 p-1.5`}
        title="AQMARINE"
      >
        <AqmarineEmblem strokeColor="#E2C8C6" strokeWidth={11} />
      </div>

      {showText && (
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-[0.18em] ${currentSize.text} ${textColor} font-sans uppercase`}>
              AQMARINE
            </span>
          </div>
          <p className={`text-[#9D6C72] font-bold tracking-[0.16em] uppercase ${currentSize.sub}`}>
            Hijab & Mukena
          </p>
        </div>
      )}
    </div>
  );
};
