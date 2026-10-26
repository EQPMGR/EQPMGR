'use client';

import { useCallback, useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Shop = {
  id: string; shop_name: string | null; city: string | null; state: string | null; phone: string | null; website: string | null;
  created_at: string; billingStatus: string; approvedAt: string | null; termsAcceptedAt: string | null;
};

const BILLING_LABEL: Record<string, string> = {
  setup_needed: 'No card yet', active: 'Card on file', past_due: 'Payment failed', paused: 'Paused (unpaid)',
};

/** Admin: approve new shops. Riders only see approved shops with a working card. */
export function ShopApprovalsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const call = useCallback(async (init?: RequestInit) => {
    if (!user) return null;
    const res = await fetch('/api/admin/shops', { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
    return data;
  }, [user]);

  const refresh = useCallback(async () => {
    try { setShops((await call())?.shops ?? []); } catch (e: any) { toast({ variant: 'destructive', title: 'Shops', description: e.message }); setShops([]); }
  }, [call, toast]);
  useEffect(() => { refresh(); }, [refresh]);

  async function setApproved(shop: Shop, approve: boolean) {
    setBusy(shop.id);
    try {
      await call({ method: 'POST', body: JSON.stringify({ shopId: shop.id, approve }) });
      toast({ title: approve ? `${shop.shop_name || 'Shop'} approved` : `${shop.shop_name || 'Shop'} hidden from riders` });
      await refresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Shops', description: e.message });
    } finally {
      setBusy(null);
    }
  }

  const pending = shops?.filter((s) => !s.approvedAt).length ?? 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Store className="h-4 w-4" /> Shop approvals {pending > 0 && <Badge variant="destructive">{pending} waiting</Badge>}
        </CardTitle>
        <CardDescription className="text-sm">
          Riders only see shops that are approved here <b>and</b> have a working card on file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {shops === null ? <p className="text-muted-foreground">Loading…</p> : shops.length === 0 ? <p className="text-muted-foreground">No shops yet.</p> : shops.map((shop) => {
          const visible = !!shop.approvedAt && (shop.billingStatus === 'active' || shop.billingStatus === 'past_due');
          return (
            <div key={shop.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                <p className="font-medium">{shop.shop_name || '(no name)'}</p>
                <p className="text-xs text-muted-foreground">
                  {[shop.city, shop.state].filter(Boolean).join(', ') || 'No address'}{shop.phone ? ` · ${shop.phone}` : ''}{shop.website ? ` · ${shop.website}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Signed up {new Date(shop.created_at).toLocaleDateString()} · {BILLING_LABEL[shop.billingStatus] ?? shop.billingStatus}
                  {shop.termsAcceptedAt ? ' · billing terms accepted' : ''} · {visible ? 'visible to riders' : 'hidden from riders'}
                </p>
              </div>
              {shop.approvedAt ? (
                <Button size="sm" variant="outline" disabled={busy === shop.id} onClick={() => setApproved(shop, false)}>Revoke</Button>
              ) : (
                <Button size="sm" disabled={busy === shop.id} onClick={() => setApproved(shop, true)}>Approve</Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
