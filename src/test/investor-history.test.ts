import { describe, expect, it } from 'vitest';
import { buildInvestmentHistory, canReadInvestorHistory } from '@/lib/investor-history';
describe('Investor transaction permissions', () => {
  it('allows an investor to read their own profile', () => expect(canReadInvestorHistory(false,'murad','murad')).toBe(true));
  it('denies another investor history', () => expect(canReadInvestorHistory(false,'murad','rayhan')).toBe(false));
  it('allows administrators to read selected investor history', () => expect(canReadInvestorHistory(true,'admin','rayhan')).toBe(true));
  it('denies users without a linked profile', () => expect(canReadInvestorHistory(false,null,'rayhan')).toBe(false));
});
describe('Investment breakdown', () => {
  const deposits = [
    {id:'later',investor_id:'murad',amount:'1500',date:'2026-02-10',created_at:'2026-02-10T10:00:00Z'},
    {id:'first',investor_id:'murad',amount:'1000',date:'2026-01-05',created_at:'2026-01-05T10:00:00Z'},
    {id:'other',investor_id:'rayhan',amount:'9000',date:'2026-01-05'},
  ];
  it('preserves own amounts, dates and transaction identifiers chronologically', () => {
    const result = buildInvestmentHistory(deposits,[],'murad');
    expect(result.transactions.map(t => [t.id,t.date,t.amount])).toEqual([['first','2026-01-05',1000],['later','2026-02-10',1500]]);
    expect(result.invested).toBe(2500);
  });
  it('uses the same own investment values in list and chart', () => {
    expect(buildInvestmentHistory(deposits,[],'murad').monthly).toEqual([
      {month:'2026-01',investment:1000,cashout:0},{month:'2026-02',investment:1500,cashout:0},
    ]);
  });
  it('includes cashout details and subtracts withdrawals from deposited balance', () => {
    const result = buildInvestmentHistory(deposits,[{id:'out',investor_id:'murad',amount:'500',date:'2026-02-11',note:'bank transfer'}],'murad');
    expect(result.balance).toBe(2000);
    expect(result.transactions.at(-1)).toMatchObject({id:'out',note:'bank transfer',balance:2000});
  });
});