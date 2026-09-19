import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RestaurantSite } from "@/components/RestaurantSite";
import type { WebsiteContent } from "@/lib/core/preview";

export const metadata = {
  robots: { index: false, follow: false }
};

export default async function PreviewPage({ params }: { params: { slug: string } }) {
  const preview = await prisma.websitePreview.findUnique({ where: { slug: params.slug } });
  if (!preview) return notFound();

  await prisma.websitePreview.update({
    where: { slug: params.slug },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() }
  });

  const content: WebsiteContent = JSON.parse(preview.contentJson);

  return <RestaurantSite content={content} isPreview={true} showConfirmationBadges={true} />;
}
