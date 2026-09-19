import { prisma } from "@/lib/db";
import { RestaurantSite } from "@/components/RestaurantSite";
import type { WebsiteContent } from "@/lib/core/preview";
import {
  requestPaymentAction,
  submitCorrectionAction,
  requestLanguageChangeAction,
  requestCustomDomainAction,
  approveAndPublishAction,
  requestDeletionAction
} from "./actions";

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const approval = await prisma.approvalToken.findUnique({
    where: { token: params.token },
    include: {
      lead: {
        include: { preview: true, publishedWebsite: true, payments: true, paymentLinks: { orderBy: { createdAt: "desc" } } }
      }
    }
  });

  if (!approval) {
    return <div className="p-8 text-center">This link is invalid.</div>;
  }
  if (approval.expiresAt < new Date()) {
    return <div className="p-8 text-center">This link has expired. Please contact us for a new one.</div>;
  }

  const { lead } = approval;
  const paid = lead.payments.some((p) => p.status === "PAID");
  const content: WebsiteContent | null = lead.preview ? JSON.parse(lead.preview.contentJson) : null;
  const latestLink = lead.paymentLinks[0];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">{lead.restaurantName} — {lead.status === "PUBLISHED" || lead.publishedWebsite ? "Your website" : "Your preview"}</h1>

      {content && (
        <div className="border rounded-lg overflow-hidden">
          <RestaurantSite content={content} isPreview={!lead.publishedWebsite} showConfirmationBadges />
        </div>
      )}

      {lead.publishedWebsite ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          Your website is live at{" "}
          <a className="text-brand-700" href={`/s/${lead.publishedWebsite.subdomain}`} target="_blank">
            /s/{lead.publishedWebsite.subdomain}
          </a>
          . Hosting is active until {lead.publishedWebsite.hostingExpiresAt.toISOString().slice(0, 10)}.
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-lg p-4 space-y-2">
            <h2 className="font-medium text-sm">Payment</h2>
            {paid ? (
              <p className="text-sm text-green-700">Payment verified. You can now submit corrections and approve publication below.</p>
            ) : latestLink ? (
              <div className="text-sm">
                <p>
                  Payment link: <a className="text-brand-700 break-all" href={latestLink.url}>{latestLink.url}</a>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {latestLink.status}. Waiting for our team to verify your payment.
                </p>
              </div>
            ) : (
              <form action={requestPaymentAction}>
                <input type="hidden" name="token" value={params.token} />
                <button className="bg-brand-600 text-white rounded px-4 py-1.5 text-sm">Get payment link</button>
              </form>
            )}
            <p className="text-xs text-gray-500">
              This $49 payment covers building the website and the first 3 months of hosting. Hosting
              then renews monthly or yearly to stay online. A custom domain is not included and costs
              extra.
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h2 className="font-medium text-sm">Corrections</h2>
            <form action={submitCorrectionAction} className="flex gap-2 flex-wrap">
              <input type="hidden" name="token" value={params.token} />
              <select name="field" className="border rounded px-2 py-1.5 text-sm">
                <option value="phone">Phone</option>
                <option value="address">Address</option>
                <option value="openingHours">Opening hours</option>
                <option value="instagramUrl">Instagram URL</option>
                <option value="facebookUrl">Facebook URL</option>
                <option value="about">About text</option>
              </select>
              <input name="newValue" placeholder="New value" required className="border rounded px-2 py-1.5 text-sm flex-1" />
              <button className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Submit</button>
            </form>

            <form action={requestLanguageChangeAction} className="flex gap-2 items-center">
              <input type="hidden" name="token" value={params.token} />
              <label className="text-sm">Language:</label>
              <select name="language" defaultValue={lead.language} className="border rounded px-2 py-1.5 text-sm">
                <option value="ar">Arabic only</option>
                <option value="ar_en">Arabic + English</option>
              </select>
              <button className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Update</button>
            </form>

            <form action={requestCustomDomainAction} className="flex gap-2">
              <input type="hidden" name="token" value={params.token} />
              <input name="domain" placeholder="yourrestaurant.com (extra cost)" className="border rounded px-2 py-1.5 text-sm flex-1" />
              <button className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Request custom domain</button>
            </form>
          </div>

          <form action={approveAndPublishAction} className="bg-white border rounded-lg p-4">
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" required />
              I have reviewed the website above and I explicitly approve publishing it.
            </label>
            <input type="hidden" name="token" value={params.token} />
            <button
              disabled={!paid}
              className={`rounded px-4 py-2 text-sm text-white ${paid ? "bg-brand-600" : "bg-gray-300 cursor-not-allowed"}`}
            >
              Approve &amp; publish my website
            </button>
            {!paid && <p className="text-xs text-gray-500 mt-1">Payment must be verified first.</p>}
          </form>

          <form action={requestDeletionAction}>
            <input type="hidden" name="token" value={params.token} />
            <button className="text-xs text-red-600 underline">Request data deletion</button>
          </form>
        </>
      )}
    </div>
  );
}
