import {describe, expect, it} from 'vitest';
import {buildProjectHistory, projectMonthlyHistory} from '@/lib/project-history';
describe('Project financial history', () => {
  const expenses = [{id:'cost',date:'2026-01-05',reason:'Purchase',amount:'125350',notes:'Receipt'}];
  const sales = [{id:'sale',date:'2026-02-02',name:'Sale',amount:'145900'}];
  it('calculates historical project result from revenue minus costs once', () => {
    expect(buildProjectHistory(expenses,sales)).toMatchObject({expenses:125350,revenue:145900,result:20550});
  });
  it('retains chronological item details and running result', () => {
    expect(buildProjectHistory(expenses,sales).transactions.map(r => [r.id,r.date,r.amount,r.balance,r.note])).toEqual([
      ['cost','2026-01-05',125350,-125350,'Receipt'],['sale','2026-02-02',145900,20550,''],
    ]);
  });
  it('charts the same transaction values as the detailed history', () => {
    expect(projectMonthlyHistory(buildProjectHistory(expenses,sales).transactions)).toEqual([
      {month:'2026-01',expense:125350,sale:0},{month:'2026-02',expense:0,sale:145900},
    ]);
  });
  it('keeps loss-making and active projects visible without distributions', () => {
    expect(buildProjectHistory(expenses,[]).result).toBe(-125350);
    expect(buildProjectHistory(expenses,[{id:'loss-sale',amount:'100000'}]).result).toBe(-25350);
  });
});