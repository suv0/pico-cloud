import { ResourceDetailView } from '@/components/resources/ResourceDetailView';

export default async function AdminResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <ResourceDetailView
      resourceUrl={`/api/admin/resources/${id}`}
      auditUrl={`/api/admin/resources/${id}/audit`}
      retryUrl={`/api/admin/resources/${id}/retry`}
      backHref="/admin/customers"
      backLabel="Customers"
      authRedirectHref="/login?next=/admin"
      notFoundMessage="VM not found"
      viewerMode="admin"
    />
  );
}
