import { AppWebView } from '@/components/app-webview';
import { TAB_URLS } from '@/constants/config';

export default function LiveTab() {
  return <AppWebView url={TAB_URLS.live} shareTitle="Live — Visit Gauteng" />;
}
