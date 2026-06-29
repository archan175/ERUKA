import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, Lock, Globe, UserCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ERUKA" },
      {
        name: "description",
        content:
          "Learn how ERUKA collects, uses, and protects your personal data on our freelancing platform.",
      },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    icon: Eye,
    title: "Information We Collect",
    content: [
      "Account Information: When you create an ERUKA account, we collect your name, email address, phone number, and professional details such as skills, portfolio links, and work history.",
      "Profile Data: Freelancers may provide additional information including bio, certifications, hourly rates, and profile photos. Clients may provide company details and project requirements.",
      "Usage Data: We automatically collect information about how you interact with the platform, including pages visited, features used, search queries, and timestamps.",
      "Payment Information: When you add a payment method or receive payouts, we collect billing details. Payment processing is handled by our secure third-party payment partners — we do not store full card numbers on our servers.",
      "Communications: Messages exchanged through ERUKA's built-in chat, proposal submissions, and support tickets are stored to facilitate project collaboration and dispute resolution.",
    ],
  },
  {
    icon: Shield,
    title: "How We Use Your Information",
    content: [
      "Platform Operations: To create and manage your account, facilitate job postings and bidding, process payments through escrow, and enable communication between clients and freelancers.",
      "Matching & Recommendations: To suggest relevant jobs to freelancers and recommend qualified freelancers to clients based on skills, experience, and past performance.",
      "Safety & Trust: To verify identities, prevent fraud, enforce our Terms of Service, and maintain the integrity of reviews and ratings on the platform.",
      "Improvements: To analyse usage patterns, diagnose technical issues, and improve platform features, user experience, and search algorithms.",
      "Communications: To send transaction confirmations, project updates, payment notifications, and — with your consent — promotional content about new features or opportunities.",
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    content: [
      "We implement industry-standard security measures including TLS/SSL encryption for all data in transit, AES-256 encryption for sensitive data at rest, and regular security audits.",
      "Access to personal data is restricted to authorised ERUKA employees who require it for platform operations. All staff undergo background checks and sign confidentiality agreements.",
      "Our escrow payment system ensures funds are held securely and released only when both parties confirm satisfactory delivery of work.",
      "We maintain comprehensive incident response procedures and will notify affected users within 72 hours of discovering any data breach, in compliance with applicable data protection regulations.",
    ],
  },
  {
    icon: Globe,
    title: "Third-Party Services",
    content: [
      "Payment Processing: We partner with RBI-compliant payment gateways to handle transactions securely. These providers have access only to payment data necessary to process your transactions.",
      "Cloud Infrastructure: Your data is hosted on secure cloud servers located in India, ensuring compliance with data localisation requirements under Indian regulations.",
      "Analytics: We use anonymised analytics tools to understand platform usage. These tools do not have access to personally identifiable information.",
      "We do not sell your personal data to third parties. Any data sharing with service providers is governed by strict data processing agreements that limit use to the services they provide to ERUKA.",
    ],
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    content: [
      "Access & Portability: You can request a copy of all personal data we hold about you in a commonly used, machine-readable format at any time from your account settings.",
      "Correction: You can update your profile information directly through the platform. For other data corrections, contact our support team.",
      "Deletion: You may request deletion of your account and associated data. We will process deletion requests within 30 days, subject to legal retention requirements for financial records.",
      "Consent Withdrawal: You can withdraw consent for marketing communications at any time through your notification preferences or by clicking the unsubscribe link in any email.",
      "Grievance Redressal: In accordance with the Digital Personal Data Protection Act 2023, you may raise concerns with our Grievance Officer at privacy@eruka.in.",
    ],
  },
  {
    icon: Mail,
    title: "Contact Us",
    content: [
      "If you have any questions about this Privacy Policy or how we handle your data, please contact our Privacy Team:",
      "Email: privacy@eruka.in",
      "Address: ERUKA Technologies Pvt. Ltd., Koramangala, Bangalore, Karnataka 560034, India",
      "This Privacy Policy was last updated on 1 June 2026. We will notify users of any material changes via email or an in-app notification at least 30 days before changes take effect.",
    ],
  },
];

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Your privacy matters to us. This policy explains how ERUKA collects,
          uses, and safeguards your personal information.
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Last updated: 1 June 2026
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              className="gradient-card border-border/50"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {section.title}
                  </h2>
                </div>
                <ul className="space-y-3 pl-12">
                  {section.content.map((paragraph, idx) => (
                    <li
                      key={idx}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
