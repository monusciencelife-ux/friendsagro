import {allocateResult, cell, confirmedDistributions, investorLedger, money, projectResult, sumAmounts, type FinanceData, type FinanceRow} from './accounting';

export type FinancialChanges = { inserts: Partial<Record<'projects'|'percentage_snapshots'|'profit_distributions'|'project_steps'|'project_sales'|'cashouts'|'investments'|'requests', FinanceRow[]>>; updates: {tab: 'projects'|'requests'; id: string; patch: FinanceRow}[]; result: {ok: boolean; profit?: number; id?: string; alreadyApplied?: boolean} };

export function completionChanges(t: FinanceData, projectId: string, timestamp: string, id: () => string): FinancialChanges {
  const project = (t.projects ?? []).find(p => cell(p,'id') === projectId);
  if (!project) throw new Error('প্রকল্প পাওয়া যায়নি');
  if (cell(project,'status') !== 'active') throw new Error('প্রকল্পটি ইতিমধ্যে সম্পন্ন হয়েছে');
  if ((t.profit_distributions ?? []).some(d => cell(d,'project_id') === projectId)) throw new Error('এই প্রকল্পের বণ্টন আগে তৈরি হয়েছে; পুনরায় বণ্টন করা যাবে না');
  const snapshots = (t.percentage_snapshots ?? []).filter(s => cell(s,'project_id') === projectId);
  const profit = projectResult(t,projectId).profit;
  const rows = allocateResult(profit,snapshots).map(({snapshot,amount}) => ({id:id(),project_id:projectId,investor_id:cell(snapshot,'investor_id'),snapshot_id:cell(snapshot,'id'),status:'credited',profit_amount:String(amount),locked_amount:cell(snapshot,'locked_amount'),notes:`${cell(project,'name')} — স্বয়ংক্রিয় লাভ / ক্ষতি বণ্টন`,resolved_at:timestamp,created_at:timestamp}));
  return {inserts:{profit_distributions:rows},updates:[{tab:'projects',id:projectId,patch:{status:'completed',actual_profit:String(profit),completed_at:timestamp,updated_at:timestamp}}],result:{ok:true,profit}};
}

export function historicalCreditChanges(t: FinanceData, projectId: string, timestamp: string, id: () => string): FinancialChanges {
  const project = (t.projects ?? []).find(p => cell(p,'id') === projectId);
  if (!project || cell(project,'status') !== 'completed') throw new Error('সম্পন্ন প্রকল্প পাওয়া যায়নি');
  const originals = (t.profit_distributions ?? []).filter(d => cell(d,'project_id') === projectId && cell(d,'status') === 'withdrawn');
  if (!originals.length) throw new Error('যোগ করার পুরোনো বণ্টন নেই');
  const existing = confirmedDistributions(t).filter(d => cell(d,'project_id') === projectId);
  if (existing.length) {
    if (originals.every(d => existing.some(e => cell(e,'notes').includes(`historical-source:${cell(d,'id')};`)))) return {inserts:{},updates:[],result:{ok:true,alreadyApplied:true,profit:sumAmounts(existing,'profit_amount')}};
    throw new Error('এই প্রকল্পে আগে অর্থ যোগ হয়েছে; হিসাব যাচাই ছাড়া পুনরায় যোগ করা যাবে না');
  }
  const snapshots = (t.percentage_snapshots ?? []).filter(s => cell(s,'project_id') === projectId);
  const profit = projectResult(t,projectId).profit;
  if (Math.abs(sumAmounts(originals,'profit_amount')-profit)>0.01 || originals.length !== snapshots.length) throw new Error('পুরোনো বণ্টন ও প্রকল্পের হিসাবে পার্থক্য রয়েছে');
  const rows = allocateResult(profit,snapshots).map(({snapshot,amount}) => {
    const sources = originals.filter(d => cell(d,'snapshot_id') === cell(snapshot,'id') && cell(d,'investor_id') === cell(snapshot,'investor_id'));
    const source = sources[0];
    if (sources.length !== 1 || !source || Math.abs(money(cell(source,'profit_amount'))-amount)>0.01) throw new Error('পুরোনো বণ্টনের অংশ যাচাই করা যায়নি');
    return {id:id(),project_id:projectId,investor_id:cell(snapshot,'investor_id'),snapshot_id:cell(snapshot,'id'),status:'credited',profit_amount:String(amount),locked_amount:cell(snapshot,'locked_amount'),notes:`historical-source:${cell(source,'id')}; ${cell(project,'name')} — হাতে না-পাওয়া পুরোনো লাভ ফান্ডে যোগ`,resolved_at:timestamp,created_at:timestamp};
  });
  return {inserts:{profit_distributions:rows},updates:[],result:{ok:true,profit}};
}

export function initialSnapshots(t: FinanceData, projectId: string, budget: number, timestamp: string, id: () => string): FinanceRow[] {
  const investors = (t.profiles ?? []).map(p => ({id:cell(p,'id'),available:Math.max(0,investorLedger(t,cell(p,'id')).available)})).filter(p => p.id && p.available>0);
  const total = money(investors.reduce((sum,p) => sum+p.available,0));
  if (!total || budget>total) throw new Error('প্রকল্পের জন্য পর্যাপ্ত ব্যবহারযোগ্য ফান্ড নেই');
  const snapshots = investors.map(p => ({id:id(),project_id:projectId,investor_id:p.id,percentage:String(p.available/total*100),locked_amount:'0',created_at:timestamp}));
  return allocateResult(budget,snapshots).map(({snapshot,amount}) => ({...snapshot,locked_amount:String(amount)}));
}