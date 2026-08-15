import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { NotFoundError } from '@/lib/api/server-client';
import { MoneyDisplay } from '@/components/data/money-display';
import { ProductTypeBadge } from '@/components/data/product-type-badge';
import { ProductGallery } from '@/features/storefront/components/product-gallery';
import { BuyWhatsappButtons } from '@/features/storefront/components/buy-whatsapp-buttons';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

type ProductPageProps = {
  params: Promise<{ username: string; slug: string }>;
};

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { username, slug } = await params;
  try {
    const product = await storefrontApi.getProduct(username, slug);
    return {
      title: `${product.name} · @${username} · Nagihin`,
      description: product.description ?? undefined,
      alternates: { canonical: `${SITE_URL}/@${username}/produk/${product.slug}` },
      openGraph: {
        title: product.name,
        description: product.description ?? undefined,
        images: product.imageUrls[0] ? [product.imageUrls[0]] : undefined,
      },
    };
  } catch {
    return { title: 'Produk tidak ditemukan · Nagihin' };
  }
};

const ProductPage = async ({ params }: ProductPageProps) => {
  const { username, slug } = await params;

  let product;
  let hasWhatsapp = false;
  try {
    product = await storefrontApi.getProduct(username, slug);
    hasWhatsapp = (await storefrontApi.getByUsername(username)).hasWhatsapp;
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
      <ProductGallery images={product.imageUrls} alt={product.name} />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ProductTypeBadge productType={product.productType} />
        </div>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <MoneyDisplay value={product.price} className="text-lg font-semibold" />
        {product.description && (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
        )}
      </div>
      <BuyWhatsappButtons productId={product.id} username={username} hasWhatsapp={hasWhatsapp} />
    </div>
  );
};

export default ProductPage;
