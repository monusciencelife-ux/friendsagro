import { createFileRoute } from '@tanstack/react-router';
import { InvestorHistory } from '@/components/InvestorHistory';
export const Route = createFileRoute('/account')({
  head: () => ({meta:[{title:'Village Agro — আমার বিনিয়োগের হিসাব'},{name:'description',content:'নিজের বিনিয়োগের তারিখ, পরিমাণ, লেনদেনের তালিকা ও মাসভিত্তিক চার্ট।'},{property:'og:title',content:'Village Agro — আমার বিনিয়োগের হিসাব'},{property:'og:description',content:'নিজের বিনিয়োগ ও লেনদেনের ব্যক্তিগত ইতিহাস।'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),
  component: () => <InvestorHistory/>,
});