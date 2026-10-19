export type HistoryRow = Record<string, string>;
export function canReadInvestorHistory(isAdmin: boolean, ownProfileId: string | null, targetId: string) {
  return targetId.length > 0 && (isAdmin || Boolean(ownProfileId));
}
export function buildInvestmentHistory(investments: HistoryRow[], cashouts: HistoryRow[], investorId: string) {
  const read = (r: HistoryRow, k: string) => r[k] ?? '';
  const transactions = [
    ...investments.filter(r => read(r, 'investor_id') === investorId).map(r => ({
      id: read(r, 'id'), type: 'investment' as const, amount: Number(read(r, 'amount')) || 0,
      date: read(r, 'date') || read(r, 'created_at'), createdAt: read(r, 'created_at'), note: '',
    })),
    ...cashouts.filter(r => read(r, 'investor_id') === investorId).map(r => ({
      id: read(r, 'id'), type: 'cashout' as const, amount: Number(read(r, 'amount')) || 0,
      date: read(r, 'date') || read(r, 'created_at'), createdAt: read(r, 'created_at'), note: read(r, 'note'),
    })),
  ].sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  let balance = 0;
  const rows = transactions.map(t => { balance += t.type === 'investment' ? t.amount : -t.amount; return {...t, balance}; });
  const monthly = new Map<string, { month: string; investment: number; cashout: number }>();
  for (const t of rows) {
    if (!/^\d{4}-\d{2}/.test(t.date)) continue;
    const month = t.date.slice(0,7);
    const item = monthly.get(month) ?? {month, investment: 0, cashout: 0};
    item[t.type] += t.amount; monthly.set(month,item);
  }
  return { transactions: rows, monthly: [...monthly.values()].sort((a,b) => a.month.localeCompare(b.month)),
    invested: transactions.filter(t => t.type === 'investment').reduce((s,t) => s+t.amount,0),
    cashout: transactions.filter(t => t.type === 'cashout').reduce((s,t) => s+t.amount,0), balance };
}