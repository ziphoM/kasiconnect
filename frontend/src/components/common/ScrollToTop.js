// frontend/src/components/common/ScrollToTop.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Force scroll to top on every route change
        const scrollToTop = () => {
            // Try multiple methods to ensure it works
            window.scrollTo(0, 0);
            
            // Also try the smooth method
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant'
            });
            
            // For browsers that might need a delay
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 10);
            
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 50);
        };

        scrollToTop();

        // Also handle popstate events (back/forward buttons)
        const handlePopState = () => {
            scrollToTop();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [pathname]);

    return null;
};

export default ScrollToTop;