import { doc, getDoc } from 'firebase/firestore';
import { db } from 'app/services/firebase/firebase.config';
import ClientWrapper from 'app/components/ClientWrapper';

export default async function CompanyPage({ params }: { params: { companyId: string } }) {
  const companyDoc = await getDoc(doc(db, 'companies', params.companyId));
  const company = companyDoc.exists() ? { id: companyDoc.id, ...companyDoc.data() } : null;

  if (!company) {
    return <div>Company not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{company.name}</h1>
      <ClientWrapper companyId={params.companyId} />
    </div>
  );
}