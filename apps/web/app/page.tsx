import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default function Page() {

  const apiUrl = '/api/proxy';

  return <Dashboard apiUrl={apiUrl} />;
}
