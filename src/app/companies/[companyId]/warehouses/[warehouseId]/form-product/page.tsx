'use client';

import { useParams } from 'next/navigation';
import { ProductFormComponent } from 'app/components/product/ProductForm';
import { withPermission } from 'app/components/withPermission';

// Envolver ProductFormComponent con withPermission
const ProductFormWithPermission = withPermission(ProductFormComponent, ['create']);

export default function FormProductPage() { 
  const params = useParams();
  const companyId = params?.companyId as string;
  const warehouseId = params?.warehouseId as string;

  if (!companyId || !warehouseId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto pb-16">
      <ProductFormWithPermission companyId={companyId} warehouseId={warehouseId} />
    </div>
  );
}