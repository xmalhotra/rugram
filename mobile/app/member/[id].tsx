import { useLocalSearchParams } from 'expo-router';
import { QramScreen } from '../../App';

/** A shared profile link: opens Home with that member's profile on top. */
export default function MemberLink() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  return <QramScreen tab="Flows" memberLink={typeof params.id === 'string' ? params.id : undefined} pushed />;
}
