import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readTabs } from './sheets.server';
import { confirmedDistributions } from './accounting';
import { buildInvestmentHistory, canReadInvestorHistory } from './investor-history';

export const getInvestorHistory = createServerFn({method: 'GET'})
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { investorId?: string }) => z.object({investorId: z.string().uuid().optional()}).parse(input))
  .handler(async ({data, context}) => {
    const [{data: own, error: profileError}, {data: isAdmin, error: roleError}] = await Promise.all([
      context.supabase.from('profiles').select('id').eq('user_id',context.userId).maybeSingle(),
      context.supabase.rpc('has_role',{_user_id: context.userId, _role: 'admin'}),
    ]);
    if (profileError || roleError) throw new Error('অনুমতি যাচাই করা যায়নি');
    const target = data.investorId ?? own?.id;
    if (!target) throw new Error('আপনার বিনিয়োগকারী প্রোফাইল যুক্ত নেই');
    if (!canReadInvestorHistory(isAdmin === true, own?.id ?? null, target)) throw new Error('এই বিনিয়োগকারীর লেনদেন দেখার অনুমতি নেই');
    const t = await readTabs(['profiles','investments','cashouts','projects','profit_distributions']);
    const profile = t.profiles.find(p => p['id'] === target);
    if (!profile) throw new Error('বিনিয়োগকারী প্রোফাইল পাওয়া যায়নি');
    return { profile: {id: target, name: profile['name'] ?? '', location: profile['location'] ?? ''},
      ...buildInvestmentHistory(t.investments,t.cashouts,target, confirmedDistributions(t).filter(d => d['investor_id'] === target).map(d => {
        const p = t.projects.find(p => p['id'] === d['project_id']);
        const amount = Math.round(Number(d['profit_amount'] || 0) * 100) / 100;
        return { id: d['id'] ?? '', amount, date: d['resolved_at'] || p?.['completed_at'] || d['created_at'] || '', note: `${amount < 0 ? 'ক্ষতি' : 'লাভ'} — ${p?.['name'] ?? 'প্রকল্প'}` };
      })) };
  });