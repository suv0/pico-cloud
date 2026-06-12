import { ResourceDetailView } from '@/components/resources/ResourceDetailView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Suspense } from 'react';

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResourceDetailView
        resourceUrl={`/api/resources/${id}`}
        auditUrl={`/api/resources/${id}/audit`}
        backHref="/resources"
        backLabel="My VMs"
      />
    </Suspense>
  );
}
