import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RestaurantSite } from "@/components/RestaurantSite";
import type { WebsiteContent } from "@/lib/core/preview";

export default async function PublishedSitePage({ params }: { params: { subdomain: string } }) {
  const site = await prisma.publishedWebsite.findUnique({ where: { subdomain: params.subdomain } });
  if (!site) return notFound();

  const content: WebsiteContent = JSON.parse(site.contentJson);

  if (site.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">{content.restaurantName}</h1>
          <p className="text-gray-600">
            Hosting for this website has expired. Please contact the platform to renew.
          </p>
        </div>
      </div>
    );
  }

  return <RestaurantSite content={content} isPreview={false} showConfirmationBadges={false} />;
}
