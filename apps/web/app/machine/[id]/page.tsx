import { use } from 'react';

import MachineDetails from './MachineDetails';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const apiUrl = '/api/proxy';

  return <MachineDetails id={id} apiUrl={apiUrl} />;
}
