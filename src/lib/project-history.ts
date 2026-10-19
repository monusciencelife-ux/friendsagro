export type ProjectHistoryRow = Record<string, string>;
export function buildProjectHistory(steps: ProjectHistoryRow[], sales: ProjectHistoryRow[]) {
  const entries = [
    ...steps.map(row => ({ id: row['id'] ?? '', type: 'expense' as const, date: row['date'] || row['created_at'] || '', createdAt: row['created_at'] ?? '', description: row['reason'] ?? '', amount: Number(row['amount']) || 0, note: row['notes'] ?? '', proofs: row['proof_images'] ?? '', updatedAt: row['updated_at'] ?? '' })),
    ...sales.map(row => ({ id: row['id'] ?? '', type: 'sale' as const, date: row['date'] || row['created_at'] || '', createdAt: row['created_at'] ?? '', description: row['name'] ?? '', amount: Number(row['amount']) || 0, note: '', proofs: '', updatedAt: row['updated_at'] ?? '' })),
  ].sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  let balance = 0;
  const transactions = entries.map(row => { balance += row.type === 'sale' ? row.amount : -row.amount; return {...row, balance}; });
  const expenses = steps.reduce((sum,row) => sum + (Number(row['amount']) || 0),0);
  const revenue = sales.reduce((sum,row) => sum + (Number(row['amount']) || 0),0);
  return {transactions, expenses, revenue, result: revenue - expenses};
}
export function projectMonthlyHistory(rows: ReturnType<typeof buildProjectHistory>['transactions']) {
  const months = new Map<string, {month: string; expense: number; sale: number}>();
  for (const row of rows) {
    if (!/^\d{4}-\d{2}/.test(row.date)) continue;
    const month = row.date.slice(0,7);
    const totals = months.get(month) ?? {month,expense:0,sale:0};
    totals[row.type] += row.amount;
    months.set(month,totals);
  }
  return [...months.values()].sort((a,b) => a.month.localeCompare(b.month));
}