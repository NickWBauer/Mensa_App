import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';

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
    const email = profile?.['E-Mail'];
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
  }, [profile?.['E-Mail']]);

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

export function useOpenDebtSum() {
  const [sum, setSum] = useState<number>(0);

  useEffect(() => {
    let active = true;

    async function loadDebt() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setSum(0);
        return;
      }

      const { data, error } = await supabase
        .from('offene_schulden')
        .select('betrag')
        .eq('user_id', userId);

      if (!active) return;
      if (error) {
        setSum(0);
      } else {
        setSum((data ?? []).reduce((acc, item) => acc + Number(item.betrag ?? 0), 0));
      }
    }

    loadDebt();

    return () => {
      active = false;
    };
  }, []);

  return sum;
}
