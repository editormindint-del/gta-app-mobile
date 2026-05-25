import { AppWebView } from '@/components/app-webview';
import { TAB_URLS } from '@/constants/config';

export default function MoreTab() {
  return <AppWebView url={TAB_URLS.more} shareTitle="More — Visit Gauteng" />;
}
