import { getSettings, getPricingConfig } from "@/lib/settings";
import { integrationStatus } from "@/lib/config";
import { updateSettingsAction, updatePricingAction } from "./actions";

export default async function SettingsPage() {
  const settings = await getSettings();
  const pricing = await getPricingConfig();
  const integrations = integrationStatus();

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Settings &amp; Integrations</h1>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium mb-3">Integrations</h2>
        <ul className="text-sm space-y-1">
          {integrations.map((i) => (
            <li key={i.name} className="flex justify-between border-b py-1 last:border-0">
              <span>{i.name}</span>
              <span className={i.mode === "live" ? "text-green-700" : "text-amber-700"}>{i.mode}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Set ANTHROPIC_API_KEY / META_APP_ID+META_APP_SECRET / PAYMENTS_PROVIDER_API_KEY in the
          environment to switch an integration to live. Nothing here is faked as connected.
        </p>
      </div>

      <form action={updateSettingsAction} className="bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="font-medium">Company &amp; AI settings</h2>
        <div>
          <label className="block text-xs mb-1">Company name</label>
          <input name="companyName" defaultValue={settings.companyName} className="w-full border rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs mb-1">AI assistant name (Arabic)</label>
          <input name="aiAssistantName" defaultValue={settings.aiAssistantName} dir="rtl" className="w-full border rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs mb-1">Business description</label>
          <textarea name="businessDescription" defaultValue={settings.businessDescription ?? ""} className="w-full border rounded px-3 py-1.5 text-sm" rows={2} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1">Outreach/day limit</label>
            <input name="outreachDailyLimit" type="number" defaultValue={settings.outreachDailyLimit} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Working hours start</label>
            <input name="workingHoursStart" type="number" defaultValue={settings.workingHoursStart} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Working hours end</label>
            <input name="workingHoursEnd" type="number" defaultValue={settings.workingHoursEnd} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1">AI confidence threshold (0-1)</label>
          <input name="aiConfidenceThreshold" type="number" step="0.01" min="0" max="1" defaultValue={settings.aiConfidenceThreshold} className="w-full border rounded px-3 py-1.5 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoFirstMessageEnabled" defaultChecked={settings.autoFirstMessageEnabled} />
          Allow AI to auto-send first messages when Meta says the conversation is eligible
        </label>
        <label className="flex items-center gap-2 text-sm text-red-700">
          <input type="checkbox" name="emergencyStop" defaultChecked={settings.emergencyStop} />
          Emergency stop (freezes ALL AI autonomy platform-wide)
        </label>
        <button className="bg-brand-600 text-white rounded px-4 py-1.5 text-sm">Save settings</button>
      </form>

      <form action={updatePricingAction} className="bg-white rounded-lg shadow p-4 space-y-3">
        <h2 className="font-medium">Pricing &amp; discounts</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1">Standard price (USD)</label>
            <input name="standardPriceUsd" type="number" step="0.01" defaultValue={pricing.standardPriceUsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Discount tier 1 (USD)</label>
            <input name="discountTier1Usd" type="number" step="0.01" defaultValue={pricing.discountTier1UsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Discount tier 2 / floor (USD)</label>
            <input name="discountTier2Usd" type="number" step="0.01" defaultValue={pricing.discountTier2UsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Absolute discount floor (USD)</label>
            <input name="discountFloorUsd" type="number" step="0.01" defaultValue={pricing.discountFloorUsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Hosting included (months)</label>
            <input name="hostingIncludedMonths" type="number" defaultValue={pricing.hostingIncludedMonths} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Renewal monthly (USD)</label>
            <input name="hostingRenewalMonthlyUsd" type="number" step="0.01" defaultValue={pricing.hostingRenewalMonthlyUsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Renewal yearly (USD)</label>
            <input name="hostingRenewalYearlyUsd" type="number" step="0.01" defaultValue={pricing.hostingRenewalYearlyUsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Custom domain fee (USD)</label>
            <input name="customDomainFeeUsd" type="number" step="0.01" defaultValue={pricing.customDomainFeeUsdCents / 100} className="w-full border rounded px-3 py-1.5 text-sm" />
          </div>
        </div>
        <button className="bg-brand-600 text-white rounded px-4 py-1.5 text-sm">Save pricing</button>
      </form>
    </div>
  );
}
