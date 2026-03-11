"use client";

import { Header } from "../_components/Header";
import { Cart } from "../_components/Cart";
import { Footer } from "../_components/Footer";
import { EnquiryForm } from "../EnquiryForm";
import { useStorefront } from "../_components/StorefrontProvider";
import { Mail, MapPin, Phone } from "@/components/icons";

interface ContactRoaster {
  id: string;
  businessName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  storefrontType: string;
}

export function ContactPage({ roaster }: { roaster: ContactRoaster }) {
  const { slug, accent, accentText } = useStorefront();

  const hasContactDetails =
    roaster.contactEmail || roaster.contactPhone || roaster.contactAddress;

  const showBusinessField =
    roaster.storefrontType === "wholesale" ||
    roaster.storefrontType === "both";

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />

      <div className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ color: "var(--sf-text)" }}
          >
            Contact Us
          </h1>
          <p
            className="text-base mb-10"
            style={{
              color: "color-mix(in srgb, var(--sf-text) 55%, transparent)",
            }}
          >
            We&apos;d love to hear from you. Send us a message and we&apos;ll get
            back to you as soon as possible.
          </p>

          <div
            className={`grid gap-8 ${hasContactDetails ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 max-w-2xl"}`}
          >
            {/* Contact details card */}
            {hasContactDetails && (
              <div className="md:col-span-2">
                <div
                  className="rounded-xl border p-6 space-y-5"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--sf-text) 8%, transparent)",
                    borderColor: "color-mix(in srgb, var(--sf-text) 15%, transparent)",
                  }}
                >
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--sf-text)" }}
                  >
                    Get in Touch
                  </h2>

                  {roaster.contactEmail && (
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: accent + "15" }}
                      >
                        <Mail className="w-4.5 h-4.5" color={accent} />
                      </div>
                      <div>
                        <p
                          className="text-xs font-medium mb-0.5"
                          style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                        >
                          Email
                        </p>
                        <a
                          href={`mailto:${roaster.contactEmail}`}
                          className="text-sm hover:underline break-all"
                          style={{ color: "var(--sf-text)" }}
                        >
                          {roaster.contactEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  {roaster.contactPhone && (
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: accent + "15" }}
                      >
                        <Phone
                          className="w-4.5 h-4.5"
                          color={accent}
                        />
                      </div>
                      <div>
                        <p
                          className="text-xs font-medium mb-0.5"
                          style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                        >
                          Phone
                        </p>
                        <a
                          href={`tel:${roaster.contactPhone}`}
                          className="text-sm hover:underline"
                          style={{ color: "var(--sf-text)" }}
                        >
                          {roaster.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {roaster.contactAddress && (
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: accent + "15" }}
                      >
                        <MapPin
                          className="w-4.5 h-4.5"
                          color={accent}
                        />
                      </div>
                      <div>
                        <p
                          className="text-xs font-medium mb-0.5"
                          style={{ color: "color-mix(in srgb, var(--sf-text) 55%, transparent)" }}
                        >
                          Address
                        </p>
                        <p
                          className="text-sm whitespace-pre-line"
                          style={{ color: "var(--sf-text)" }}
                        >
                          {roaster.contactAddress}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enquiry form */}
            <div className={hasContactDetails ? "md:col-span-3" : ""}>
              <EnquiryForm
                roasterId={roaster.id}
                slug={slug}
                accentColour={accent}
                accentText={accentText}
                showBusinessField={showBusinessField}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
