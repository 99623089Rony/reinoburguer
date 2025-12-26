import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

export const BurgerIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
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
    >
        {/* Top Bun */}
        <path d="M12 4C7.5 4 4 6.5 4 9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2c0-2.5-3.5-5-8-5z" />
        {/* Lettuce/Cheese Line */}
        <path d="M4 11s1 1 2 1 2-1 2-1 1 1 2 1 2-1 2-1" />
        {/* Patty */}
        <rect x="4" y="13" width="16" height="3" rx="1" />
        {/* Bottom Bun */}
        <path d="M5 17h14c.6 0 1 .4 1 1s-.4 2-1 2H5c-.6 0-1-.8-1-2s.4-1 1-1z" />
    </svg>
);

export const FriesIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
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
    >
        {/* Fries Box */}
        <path d="M5 21h14l1.5-9H3.5L5 21z" />
        {/* Fries Sticks */}
        <path d="M7 12V7" />
        <path d="M10 12V6" />
        <path d="M14 12V6" />
        <path d="M17 12V7" />
    </svg>
);

export const SodaCanIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
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
    >
        {/* Can Body */}
        <path d="M7 6v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" />
        {/* Can Top */}
        <path d="M17 6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2" />
        {/* Tab/Detail */}
        <path d="M12 8v8" />
        <path d="M8 6h8" />
    </svg>
);

export const ComboIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
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
    >
        {/* Small Burger (Left) */}
        <path d="M4 14c0-1 1-2 3-2s3 1 3 2" />
        <rect x="4" y="14" width="6" height="4" rx="1" />

        {/* Small Soda (Back/Right) */}
        <path d="M16 10v10a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V10" />
        <path d="M16 10h4" />
        <path d="M18 7v3" />

        {/* Small Fries (Front/Center) */}
        <path d="M11 14l1 6h3l1-6H11z" />
        <path d="M12 11v3" />
        <path d="M14 11v3" />
    </svg>
);
