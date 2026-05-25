import { AppWebView } from '@/components/app-webview';
import { TAB_URLS } from '@/constants/config';

export default function VisitTab() {
  return <AppWebView url={TAB_URLS.visit} shareTitle="Visit Gauteng" />;
}
