import { useEffect, useRef, useState } from "react";

function useDebounce<T>(value: T, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const [updatePending, setUpdatePending] = useState(false);
    const mountRun = useRef(true);
    useEffect(() => {
        if (mountRun.current) {
            mountRun.current = false;
            return;
        }

        if (!mountRun.current) setUpdatePending(true);

        const timer = setTimeout(() => {
            setDebouncedValue(value);
            setUpdatePending(false);
        }, delay || 500);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return [debouncedValue, updatePending] as const;
}

export default useDebounce;
