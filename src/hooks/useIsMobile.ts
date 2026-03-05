import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint: number = 768) => {
    // Initial check on mount
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let timeoutId: number;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                setIsMobile(window.innerWidth < breakpoint);
            }, 100); // Pequeño debounce para optimizar rendimiento
        };

        // Forzamos un chequeo inicial por si el framework falló en el hydrate
        handleResize();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, [breakpoint]);

    return isMobile;
};
