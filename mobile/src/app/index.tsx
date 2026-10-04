import { Redirect } from 'expo-router';
import { useApp } from '../state/store';

/** First launch runs onboarding; afterwards the app opens straight on Home. */
export default function Index() {
  const onboarded = useApp(s => s.onboarded);
  return <Redirect href={onboarded ? '/home' : '/splash'} />;
}
