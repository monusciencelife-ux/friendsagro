// Pure accounting rules shared by server read models and tests.
export type FinanceRow = Record<string, string>;
export type FinanceData = Record<string, FinanceRow[]>;
export const cell = (r: FinanceRow, k: string) => r[k] ?? "";
export function money(value: string | number | undefined): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) throw new Error("অবৈধ আর্থিক অঙ্ক");
  return Math.round(n * 100) / 100;
}
export const sumAmounts = (rows: FinanceRow[], key = "amount") => money(rows.reduce((s, r) => s + Number(cell(r, key) || 0), 0));
export function projectResult(t: FinanceData, id: string) {
  const costs = sumAmounts((t['project_steps'] ?? []).filter(r => cell(r, 'project_id') === id));
  const revenue = sumAmounts((t['project_sales'] ?? []).filter(r => cell(r, 'project_id') === id));
  return { costs, revenue, profit: money(revenue - costs) };
}
export function confirmedDistributions(t: FinanceData) {
  const completed = new Set((t['projects'] ?? []).filter(p => cell(p, 'status') === 'completed').map(p => cell(p, 'id')));
  const seen = new Set<string>();
  return (t['profit_distributions'] ?? []).filter(d => {
    const id = cell(d, 'id');
    if (seen.has(id) || !completed.has(cell(d, 'project_id')) || !['credited', 'adjustment'].includes(cell(d, 'status'))) return false;
    seen.add(id); return true;
  });
}
export function allocateResult(result: number, snapshots: FinanceRow[]) {
  if (!snapshots.length) throw new Error('প্রকল্পের বিনিয়োগের অংশ সংরক্ষিত নেই');
  const ids = new Set<string>();
  let total = 0;
  for (const s of snapshots) {
    const id = cell(s, 'investor_id'); const pct = Number(cell(s, 'percentage'));
    if (!id || ids.has(id) || !Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error('প্রকল্পের অংশের হিসাব সঠিক নয়');
    ids.add(id); total += pct;
  }
  if (Math.abs(total - 100) > 0.000001) throw new Error('প্রকল্পের মোট অংশ ১০০% হতে হবে');
  const cents = Math.round(result * 100);
  const shares = snapshots.map(s => ({ snapshot: s, raw: cents * Number(cell(s, 'percentage')) / 100 }));
  const rounded = shares.map(s => Math.floor(s.raw));
  const remainder = cents - rounded.reduce((a,b) => a+b, 0);
  const order = shares.map((s,i) => ({i, fraction: s.raw - Math.floor(s.raw)})).sort((a,b) => b.fraction - a.fraction || a.i-b.i);
  for (let i=0;i<remainder;i++) { const target = order[i]; if (target) rounded[target.i] = (rounded[target.i] ?? 0) + 1; }
  return shares.map((s,i) => ({ snapshot: s.snapshot, amount: (rounded[i] ?? 0) / 100 }));
}
export function investorLedger(t: FinanceData, investorId: string) {
  const own = (tab: string) => (t[tab] ?? []).filter(r => cell(r, 'investor_id') === investorId);
  const projects = t['projects'] ?? [];
  const snapshots = own('percentage_snapshots');
  const deposits = own('investments'), withdrawals = own('cashouts');
  const distributions = confirmedDistributions(t).filter(d => cell(d, 'investor_id') === investorId);
  const entries = [
    ...deposits.map(r => ({ id: cell(r,'id'), date: cell(r,'date') || cell(r,'created_at'), kind: 'deposit', projectId: '', projectName: '', amount: money(cell(r,'amount')), percentage: 0, projectResult: 0, allocated: 0, note: '' })),
    ...withdrawals.map(r => ({ id: cell(r,'id'), date: cell(r,'date') || cell(r,'created_at'), kind: 'cashout', projectId: '', projectName: '', amount: -money(cell(r,'amount')), percentage: 0, projectResult: 0, allocated: 0, note: cell(r,'note') })),
    ...snapshots.map(s => { const p = projects.find(p => cell(p,'id') === cell(s,'project_id')); return { id: cell(s,'id'), date: cell(s,'created_at'), kind: 'allocation', projectId: cell(s,'project_id'), projectName: p ? cell(p,'name') : '', amount: 0, percentage: Number(cell(s,'percentage')), projectResult: 0, allocated: money(cell(s,'locked_amount')), note: '' }; }),
    ...distributions.map(d => { const p = projects.find(p => cell(p,'id') === cell(d,'project_id')); const s = snapshots.find(s => cell(s,'id') === cell(d,'snapshot_id')); const amount = money(cell(d,'profit_amount')); return { id: cell(d,'id'), date: cell(d,'resolved_at') || (p ? cell(p,'completed_at') : '') || cell(d,'created_at'), kind: cell(d,'status') === 'adjustment' ? 'adjustment' : amount < 0 ? 'loss' : 'profit', projectId: cell(d,'project_id'), projectName: p ? cell(p,'name') : '', amount, percentage: s ? Number(cell(s,'percentage')) : 0, projectResult: p ? projectResult(t, cell(p,'id')).profit : 0, allocated: 0, note: cell(d,'notes') }; }),
  ].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let balance = 0;
  const history = entries.map(e => { balance = money(balance + e.amount); return {...e, balance}; });
  const deposited = sumAmounts(deposits), cashout = sumAmounts(withdrawals), profit = sumAmounts(distributions,'profit_amount');
  const activeIds = new Set(projects.filter(p => cell(p,'status') === 'active').map(p => cell(p,'id')));
  const locked = sumAmounts(snapshots.filter(s => activeIds.has(cell(s,'project_id'))), 'locked_amount');
  return { deposited, cashout, profit, balance, locked, available: money(balance - locked), history,
    projects: snapshots.map(s => { const p = projects.find(p => cell(p,'id') === cell(s,'project_id')); return { id: cell(s,'project_id'), name: p ? cell(p,'name') : '', status: p ? cell(p,'status') : '', percentage: Number(cell(s,'percentage')), invested: money(cell(s,'locked_amount')), profit: sumAmounts(distributions.filter(d => cell(d,'snapshot_id') === cell(s,'id')), 'profit_amount') }; }),
    pending: own('profit_distributions').filter(d => !['credited','adjustment','reinvested'].includes(cell(d,'status'))),
  };
}