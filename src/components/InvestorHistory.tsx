import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BarChart3, List, RefreshCw, ArrowLeft, UserRound } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { getInvestorHistory } from '@/lib/investor-history.functions';
import { bnDate, bnNum, bnTaka } from '@/lib/format';

export function InvestorHistory({investorId}: {investorId?: string}) {
  const fetchHistory = useServerFn(getInvestorHistory);
  const [view,setView] = useState<'list'|'chart'>('list');
  const [type,setType] = useState('all');
  const [from,setFrom] = useState('');
  const [to,setTo] = useState('');
  const query = useQuery({queryKey:['investor-history',investorId ?? 'self'],queryFn: () => fetchHistory({data:investorId ? {investorId} : {}}),retry:false});
  const data = query.data;
  const rows = (data?.transactions ?? []).filter(t => (type === 'all' || type === t.type) && (!from || t.date.slice(0,10) >= from) && (!to || t.date.slice(0,10) <= to));
  return <div className="page-container">
    <Link to="/investors" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4"/>বিনিয়োগকারী তালিকা</Link>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><UserRound className="size-8 shrink-0 text-primary"/><div><h1 className="break-words text-2xl font-bold">{data?.profile.name ?? 'আমার হিসাব'}</h1><p className="text-sm text-muted-foreground">বিনিয়োগ ও লেনদেনের ইতিহাস</p></div></div>
      <Button variant="outline" size="icon" aria-label="হিসাব হালনাগাদ" title="হিসাব হালনাগাদ" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={query.isFetching ? 'animate-spin' : ''}/></Button>
    </div>
    {query.isPending ? <div role="status" className="mt-6 h-40 animate-pulse rounded-lg bg-muted"/> : query.isError ? <div role="alert" className="mt-6 space-y-4"><p className="text-destructive">{query.error instanceof Error && query.error.message && !query.error.message.includes('Response') ? query.error.message : 'হিসাব দেখতে লগইন করুন।'}</p><Button asChild variant="outline"><Link to="/login">লগইন</Link></Button></div> : data && <>
      <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-3">{[
        ['মোট বিনিয়োগ',data.invested],['মোট ক্যাশআউট',data.cashout],['জমা − ক্যাশআউট',data.balance],
      ].map(([label,value]) => <div key={String(label)} className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 break-words text-xl font-bold text-primary">{bnTaka(Number(value))}</p></div>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><h2 className="section-title">লেনদেন</h2><div className="flex gap-1" role="group" aria-label="হিসাব প্রদর্শন"><Button variant={view === 'list' ? 'secondary':'ghost'} aria-pressed={view === 'list'} onClick={() => setView('list')}><List/>তালিকা</Button><Button variant={view === 'chart' ? 'secondary':'ghost'} aria-pressed={view === 'chart'} onClick={() => setView('chart')}><BarChart3/>চার্ট</Button></div></div>
      {view === 'list' ? <>
        <div className="my-4 flex flex-wrap gap-3">
          <label className="text-sm">ধরন<select value={type} onChange={e=>setType(e.target.value)} className="mt-1 block h-9 rounded-md border bg-background px-3"><option value="all">সব লেনদেন</option><option value="investment">বিনিয়োগ</option><option value="cashout">ক্যাশআউট</option></select></label>
          <label className="text-sm">শুরুর তারিখ<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="mt-1 block h-9 rounded-md border bg-background px-2"/></label>
          <label className="text-sm">শেষ তারিখ<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)} className="mt-1 block h-9 rounded-md border bg-background px-2"/></label>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">লেনদেন: {bnNum(rows.length)}</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted"><tr>{['তারিখ','ধরন','পরিমাণ','জমা − ক্যাশআউট','লেনদেনের বিবরণ'].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y">{rows.map(t=><tr key={t.id}><td className="whitespace-nowrap px-3 py-3">{bnDate(t.date)}</td><td className="px-3 py-3">{t.type === 'investment' ? 'বিনিয়োগ':'ক্যাশআউট'}</td><td className={`whitespace-nowrap px-3 py-3 font-semibold ${t.type === 'cashout' ? 'text-destructive':'text-primary'}`}>{t.type === 'cashout' ? '−':''}{bnTaka(t.amount)}</td><td className="whitespace-nowrap px-3 py-3">{bnTaka(t.balance)}</td><td className="max-w-72 break-words px-3 py-3"><p>{t.note || '—'}</p><p className="mt-1 break-all text-xs text-muted-foreground">ID: {t.id}</p></td></tr>)}</tbody></table></div>
        {rows.length === 0 && <p className="py-10 text-center text-muted-foreground">কোনো লেনদেন পাওয়া যায়নি</p>}
      </> : data.monthly.length === 0 ? <p className="py-10 text-center text-muted-foreground">চার্টের জন্য কোনো লেনদেন নেই</p> : <div className="mt-5"><h3 className="mb-4 font-semibold">মাসভিত্তিক বিনিয়োগ ও ক্যাশআউট</h3><div className="h-80 w-full" role="img" aria-label="মাসভিত্তিক বিনিয়োগ ও ক্যাশআউট চার্ট"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly} margin={{top:10,right:10,left:10,bottom:10}} accessibilityLayer><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="month" tickFormatter={v=>bnDate(`${v}-01`)} stroke="var(--muted-foreground)" tick={{fontSize:12}}/><YAxis tickFormatter={v=>bnNum(v)} stroke="var(--muted-foreground)" tick={{fontSize:12}} width={70}/><Tooltip formatter={v=>bnTaka(Number(v))} labelFormatter={v=>bnDate(`${v}-01`)} contentStyle={{background:'var(--card)',borderColor:'var(--border)',color:'var(--foreground)'}}/><Legend/><Bar dataKey="investment" name="বিনিয়োগ" fill="var(--chart-1)" maxBarSize={40}/><Bar dataKey="cashout" name="ক্যাশআউট" fill="var(--destructive)" maxBarSize={40}/></BarChart></ResponsiveContainer></div></div>}
    </>}
  </div>;
}