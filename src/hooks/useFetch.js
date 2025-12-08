// src/hooks/useFetch.js

import { useEffect, useState } from "react";

export function useFetch(asyncFn, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            setErr("");

            try {
                const res = await asyncFn();   // ❗ asyncFn() ต้องไม่มี credentials
                if (alive) setData(res);
            } catch (e) {
                if (alive) setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, deps); // eslint-disable-line

    return { data, loading, err };
}
