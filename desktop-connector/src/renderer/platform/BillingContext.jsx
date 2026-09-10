import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from '../../../../src/desktop/identity';
import { summarizeEntitlements } from '../../../../src/lib/billingSummary';
import { getEntitlements, startCheckout, startSubscriptionCheckout, startPremiumBalanceCheckout, openPortal, cancelSubscription } from './billing';
const Context = createContext(null);
export function BillingProvider({ children }) {
  const [user, setUser] = useState(getAuth().currentUser);
  const [raw, setRaw] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  const sequence = useRef(0);
  useEffect(() => {
    const remove = onAuthStateChanged(getAuth(), value => { ++sequence.current; setUser(value); setRaw(null); setError(null); });
    return () => { ++sequence.current; remove(); };
  }, []);
  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const current = ++sequence.current;
    setLoading(true);
    try { const result = await getEntitlements(); if (current === sequence.current) { setRaw(result); setError(null); } }
    catch (failure) { if (current === sequence.current) setError(failure.message); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <Context.Provider value={{ ...summarizeEntitlements(raw), user, authReady: true, loading, error, refresh, checkout: startCheckout,
    subscriptionCheckout: startSubscriptionCheckout, premiumBalanceCheckout: startPremiumBalanceCheckout, portal: openPortal, cancel: cancelSubscription }}>{children}</Context.Provider>;
}
export function useBilling() { return useContext(Context); }
