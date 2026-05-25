import { AppWebView } from '@/components/app-webview';
import { TAB_URLS } from '@/constants/config';

export default function BusinessTab() {
  return <AppWebView url={TAB_URLS.business} shareTitle="Business Events — Visit Gauteng" />;
}
