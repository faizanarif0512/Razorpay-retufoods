import type { Metadata } from 'next';
import SubscribeClient from '@/components/subscriptions/SubscribeClient';

export const metadata: Metadata = {
  title: 'Subscribe',
  description: 'mi-biotics™ 2-week and 4-week subscriptions — one chilled delivery per billing cycle.',
};

export default function SubscribePage() {
  return <SubscribeClient />;
}
