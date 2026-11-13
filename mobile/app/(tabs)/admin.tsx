import { Redirect } from 'expo-router';
import ManagementScreen from '../management';
import { useSession } from '../../src/session';
export default function AdminScreen() {
  const { data } = useSession();
  return data?.user.role === 'admin' ? <ManagementScreen /> : <Redirect href="/(tabs)" />;
}
