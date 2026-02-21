import { useEffect, useState } from "react";

/**
 * useDebounce
 * Returns a debounced copy of `value` that only updates after `delay` ms.
 * Used to avoid firing API requests on every keystroke in search inputs.
 */

export function useDebounce(value, delay = 400) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};