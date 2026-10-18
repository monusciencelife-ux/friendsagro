import { createFileRoute } from '@tanstack/react-router';
import { InvestorHistory } from '@/components/InvestorHistory';
export const Route = createFileRoute('/investor/$id')({
  head: () => ({meta:[{title:'Village Agro — বিনিয়োগকারীর লেনদেন'},{name:'description',content:'অনুমতিসাপেক্ষে বিনিয়োগকারীর বিনিয়োগের বিস্তারিত তালিকা ও চার্ট।'},{property:'og:title',content:'Village Agro — বিনিয়োগকারীর লেনদেন'},{property:'og:description',content:'বিনিয়োগকারীর অনুমতিভিত্তিক লেনদেনের ইতিহাস।'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),
  component: ProfileHistory,
});
function ProfileHistory() { const {id} = Route.useParams(); return <InvestorHistory investorId={id}/>; }