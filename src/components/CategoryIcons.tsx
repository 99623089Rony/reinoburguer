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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Top Bun with sesame seeds */}
        <path d="M4 10c0-3.3 3.6-6 8-6s8 2.7 8 6H4z" fill="currentColor" fillOpacity="0.15" />
        <path d="M4 10c0-3.3 3.6-6 8-6s8 2.7 8 6" />
        <circle cx="8" cy="6" r="0.5" fill="currentColor" />
        <circle cx="12" cy="5" r="0.5" fill="currentColor" />
        <circle cx="16" cy="6" r="0.5" fill="currentColor" />
        <circle cx="10" cy="7" r="0.5" fill="currentColor" />
        <circle cx="14" cy="7" r="0.5" fill="currentColor" />
        {/* Lettuce wavy */}
        <path d="M3 10.5c1 .5 2 0 3 .5s2 1 3 .5 2-.5 3 0 2 .5 3 0 2-.5 3 0 2 .5 3 0" strokeWidth="1" />
        {/* Cheese */}
        <path d="M4 12h16v1.5l-2 1-2-1-2 1-2-1-2 1-2-1-2 1v-1.5z" fill="currentColor" fillOpacity="0.2" />
        {/* Patty */}
        <rect x="3" y="14" width="18" height="3" rx="1.5" fill="currentColor" fillOpacity="0.3" />
        <rect x="3" y="14" width="18" height="3" rx="1.5" />
        {/* Bottom Bun */}
        <path d="M4 18h16a1 1 0 0 1 1 1c0 1-1 2-2 2H5c-1 0-2-1-2-2a1 1 0 0 1 1-1z" fill="currentColor" fillOpacity="0.15" />
        <path d="M4 18h16a1 1 0 0 1 1 1c0 1-1 2-2 2H5c-1 0-2-1-2-2a1 1 0 0 1 1-1z" />
    </svg>
);

export const FriesIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Fries Box with brand stripe */}
        <path d="M5 10l1 11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-11H5z" fill="currentColor" fillOpacity="0.15" />
        <path d="M5 10l1 11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-11H5z" />
        {/* Red stripe detail */}
        <path d="M6 12h12" strokeWidth="2" strokeOpacity="0.3" />
        {/* Multiple fries sticks with varying heights */}
        <path d="M7 10V4" strokeWidth="2" />
        <path d="M9.5 10V3" strokeWidth="2" />
        <path d="M12 10V2" strokeWidth="2" />
        <path d="M14.5 10V3" strokeWidth="2" />
        <path d="M17 10V4" strokeWidth="2" />
        {/* Extra fries for fullness */}
        <path d="M8 10V5.5" strokeWidth="1.5" strokeOpacity="0.7" />
        <path d="M11 10V4" strokeWidth="1.5" strokeOpacity="0.7" />
        <path d="M13 10V3.5" strokeWidth="1.5" strokeOpacity="0.7" />
        <path d="M16 10V5" strokeWidth="1.5" strokeOpacity="0.7" />
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
        {/* Cup body - simple trapezoid shape */}
        <path d="M7 8l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13H7z" fill="currentColor" fillOpacity="0.15" />
        <path d="M7 8l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13H7z" />
        {/* Cup lid */}
        <path d="M6 8h12" />
        {/* Straw */}
        <path d="M14 8V2" />
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
        {/* Simple Burger (left side) */}
        {/* Top bun */}
        <path d="M2 12c0-2 2-4 5-4s5 2 5 4H2z" fill="currentColor" fillOpacity="0.15" />
        <path d="M2 12c0-2 2-4 5-4s5 2 5 4H2z" />
        {/* Patty */}
        <path d="M2 13h10v2H2z" fill="currentColor" fillOpacity="0.2" />
        <path d="M2 13h10" />
        <path d="M2 15h10" />
        {/* Bottom bun */}
        <path d="M2 16h10c0 1-.5 2-1.5 2h-7C2.5 18 2 17 2 16z" fill="currentColor" fillOpacity="0.15" />
        <path d="M2 16h10c0 1-.5 2-1.5 2h-7C2.5 18 2 17 2 16z" />

        {/* Simple Cup with straw (right side) */}
        <path d="M15 10l.8 10a1 1 0 0 0 1 1h2.4a1 1 0 0 0 1-.9L21 10h-6z" fill="currentColor" fillOpacity="0.15" />
        <path d="M15 10l.8 10a1 1 0 0 0 1 1h2.4a1 1 0 0 0 1-.9L21 10h-6z" />
        {/* Lid */}
        <path d="M14.5 10h7" />
        {/* Straw */}
        <path d="M19 10V4" />
    </svg>
);

// Additional icons for more categories
export const DessertIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Ice cream cone */}
        <path d="M12 22L7 10h10L12 22z" fill="currentColor" fillOpacity="0.15" />
        <path d="M12 22L7 10h10L12 22z" />
        {/* Waffle pattern */}
        <path d="M8.5 13l7-3M8.5 16l5-3" strokeWidth="0.75" strokeOpacity="0.5" />
        {/* Ice cream scoops */}
        <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.2" />
        <circle cx="12" cy="7" r="4" />
        <circle cx="9" cy="5" r="2.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="9" cy="5" r="2.5" />
        <circle cx="15" cy="5" r="2.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="15" cy="5" r="2.5" />
        {/* Cherry on top */}
        <circle cx="12" cy="2" r="1.5" fill="currentColor" fillOpacity="0.3" />
        <path d="M12 2c0-1 1-2 2-1" />
    </svg>
);

export const PortionsIcon: React.FC<IconProps> = ({ size = 24, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Bowl */}
        <path d="M4 11c0 5 3.5 9 8 9s8-4 8-9H4z" fill="currentColor" fillOpacity="0.15" />
        <path d="M4 11c0 5 3.5 9 8 9s8-4 8-9H4z" />
        {/* Bowl rim */}
        <ellipse cx="12" cy="11" rx="8" ry="2" fill="currentColor" fillOpacity="0.1" />
        <ellipse cx="12" cy="11" rx="8" ry="2" />
        {/* Food items - onion rings representation */}
        <circle cx="9" cy="8" r="2" strokeWidth="1.5" />
        <circle cx="14" cy="7" r="2" strokeWidth="1.5" />
        <circle cx="11" cy="6" r="1.5" strokeWidth="1.5" />
        <circle cx="16" cy="9" r="1.5" strokeWidth="1.5" />
        <circle cx="7" cy="9" r="1.5" strokeWidth="1.5" />
    </svg>
);
