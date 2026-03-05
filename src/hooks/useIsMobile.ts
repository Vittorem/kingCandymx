import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint: number = 768) => {
    const isMobileDevice = () => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

        const hasMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasMobileWidth = window.innerWidth < breakpoint;
        // User agent es la verdad absoluta para celulares físicos, innerWidth aporta soporte responsivo en web desktop.
        return hasMobileUA || hasMobileWidth;
    };

    const [isMobile, setIsMobile] = useState(isMobileDevice());

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let timeoutId: number;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                setIsMobile(isMobileDevice());
            }, 100);
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
