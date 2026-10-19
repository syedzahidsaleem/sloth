import { FC, SVGProps } from 'react';

export interface SlothLogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export const SlothLogo: FC<SlothLogoProps> = ({ size = 20, className = '', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Headband */}
      <path d="M4 12a8 8 0 0 1 16 0" strokeWidth="2.2" />
      {/* Head */}
      <circle cx="12" cy="13.5" r="6" fill="currentColor" fillOpacity="0.08" strokeWidth="2" />
      {/* Earcups */}
      <rect x="2" y="11" width="3.5" height="5.5" rx="1.5" fill="currentColor" strokeWidth="2" />
      <rect x="18.5" y="11" width="3.5" height="5.5" rx="1.5" fill="currentColor" strokeWidth="2" />
      {/* Sloth Eye Patches */}
      <path d="M7.5 12.5c1.2-.5 2.5 0 2.5 1.5s-1.3 1.5-2.5 1c-.8-.3-.8-2 0-2.5z" fill="currentColor" />
      <path d="M16.5 12.5c-1.2-.5-2.5 0-2.5 1.5s1.3 1.5 2.5 1c.8-.3.8-2 0-2.5z" fill="currentColor" />
      {/* Eyes */}
      <circle cx="9.2" cy="13.5" r="0.75" fill="#fff" stroke="none" />
      <circle cx="14.8" cy="13.5" r="0.75" fill="#fff" stroke="none" />
      {/* Snout and Nose */}
      <ellipse cx="12" cy="15.8" rx="2" ry="1.2" fill="currentColor" fillOpacity="0.15" stroke="none" />
      <circle cx="12" cy="15.4" r="0.8" fill="currentColor" stroke="none" />
      {/* Gentle smile */}
      <path d="M11 16.6c.6.4 1.4.4 2 0" strokeWidth="1.2" />
    </svg>
  );
};

export default SlothLogo;
