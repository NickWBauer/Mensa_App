import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type OpenOrdersCountContextValue = {
  openOrdersCount: number;
  adjustOpenOrdersCount: (delta: number) => void;
  setOpenOrdersCount: (value: number) => void;
};

const OpenOrdersCountContext = createContext<OpenOrdersCountContextValue>({
  openOrdersCount: 0,
  adjustOpenOrdersCount: () => {},
  setOpenOrdersCount: () => {},
});

export function OpenOrdersCountProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuthContext();
  const [openOrdersCount, setOpenOrdersCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    const email = profile?.email;
    if (!email) {
      setOpenOrdersCount(0);
      return;
    }

    supabase
      .from('Bestellungen')
      .select('id')
      .eq('email', email)
      .eq('status', 'bestellt')
      .then(({ data }) => {
        if (!active) return;
        setOpenOrdersCount(data?.length ?? 0);
      });

    return () => {
      active = false;
    };
  }, [profile?.email]);

  const value = useMemo(
    () => ({
      openOrdersCount,
      adjustOpenOrdersCount: (delta: number) => setOpenOrdersCount(prev => Math.max(0, prev + delta)),
      setOpenOrdersCount,
    }),
    [openOrdersCount]
  );

  return createElement(OpenOrdersCountContext.Provider, { value }, children);
}

export function useOpenOrdersCount() {
  return useContext(OpenOrdersCountContext).openOrdersCount;
}

export function useOpenOrdersCountActions() {
  const { adjustOpenOrdersCount, setOpenOrdersCount } = useContext(OpenOrdersCountContext);
  return { adjustOpenOrdersCount, setOpenOrdersCount };
}

