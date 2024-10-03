/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  async redirects() {
    return [
      // {
      //   source: '/',
      //   destination: '/store',
      //   permanent: true,
      // },
      {
        source: '/create-store',
        destination: '/store/create',
        permanent: true,
      },
      {
        source: '/inventory-exb/:id',
        destination: '/store/:id/exhibition-inventory',
        permanent: true,
      },
      {
        source: '/unassigned-exb/:id',
        destination: '/store/:id/unassigned-exhibition',
        permanent: true,
      },
      // Remove or modify these redirects if they're causing loops
      // {
      //   source: '/form-product/:warehouseId',
      //   destination: '/warehouses/:warehouseId/form-product',
      //   permanent: true,
      // },
      // {
      //   source: '/update-product/:warehouseId/:productId',
      //   destination: '/warehouses/:warehouseId/update-product/:productId',
      //   permanent: true,
      // },
      // {
      //   source: '/form-box/:warehouseId',
      //   destination: '/warehouses/:warehouseId/form-box',
      //   permanent: true,
      // },
      // {
      //   source: '/update-box/:warehouseId/:boxId',
      //   destination: '/warehouses/:warehouseId/update-box/:boxId',
      //   permanent: true,
      // },
    ]
  },
};

export default nextConfig;