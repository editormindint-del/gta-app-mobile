import { AppWebView } from '@/components/app-webview';
import { TAB_URLS } from '@/constants/config';

export default function MarketTab() {
  return <AppWebView url={TAB_URLS.market} shareTitle="Marketplace — Visit Gauteng" />;
}
