import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  UserCheck,
  Briefcase,
  CreditCard,
  Scale,
  AlertTriangle,
  ShieldOff,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ERUKA" },
      {
        name: "description",
        content:
          "Read the Terms of Service that govern your use of the ERUKA freelancing platform.",
      },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or using the ERUKA platform — including our website, mobile applications, and APIs — you agree to be bound by these Terms of Service and all applicable laws and regulations.",
      "If you are using ERUKA on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these terms. If you do not agree to these terms, you must not use the platform.",
      'ERUKA reserves the right to update these terms at any time. We will notify registered users of material changes via email at least 30 days in advance. Your continued use of the platform after changes take effect constitutes acceptance of the revised terms. The term "Services" refers to all features, tools, and offerings available through the ERUKA platform.',
    ],
  },
  {
    icon: UserCheck,
    title: "2. User Accounts",
    content: [
      "You must be at least 18 years of age to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.",
      "You agree to provide accurate, current, and complete information during registration and to keep your profile updated. Misrepresenting your identity, skills, qualifications, or work history is a violation of these terms and may result in account suspension.",
      "Each individual may maintain only one account. Creating multiple accounts to circumvent bans, manipulate reviews, or artificially bid on jobs is strictly prohibited.",
      "You must notify ERUKA immediately if you become aware of any unauthorised use of your account. We are not liable for losses arising from unauthorised access that is not reported promptly.",
    ],
  },
  {
    icon: Briefcase,
    title: "3. Job Posting & Bidding",
    content: [
      "Clients may post job listings describing the scope of work, required skills, budget range, and timeline. All job postings must be for lawful purposes and must accurately represent the work to be performed.",
      "Freelancers may submit bids (proposals) on open jobs, including their proposed rate, estimated timeline, and a cover message. Submitting a bid constitutes a binding offer that remains valid until the client accepts, rejects, or the listing closes.",
      "Once a client accepts a bid, a binding agreement is formed between the client and the freelancer. ERUKA acts solely as a platform facilitator and is not a party to this agreement. Both parties are expected to communicate in good faith and fulfil their obligations.",
      "ERUKA reserves the right to remove job listings or bids that violate these terms, contain misleading information, or promote prohibited activities including — but not limited to — illegal services, academic dishonesty, and discriminatory hiring practices.",
    ],
  },
  {
    icon: CreditCard,
    title: "4. Payments & Escrow",
    content: [
      "ERUKA operates a secure escrow system to protect both clients and freelancers. When a bid is accepted, the client funds the escrow with the agreed amount before work begins.",
      "Escrow funds are released to the freelancer upon the client's approval of the delivered work, or automatically after a 14-day review period if the client does not raise a dispute. Partial releases are available for milestone-based projects.",
      "ERUKA charges a service fee on completed transactions: 10% for freelancers and 5% for clients. Fees are deducted automatically at the time of escrow release. Fee schedules may change with 30 days' notice.",
      "Refunds are processed through our dispute resolution system. If a freelancer fails to deliver as agreed or the work is materially deficient, the client may request a full or partial refund through the platform's mediation process.",
      "All payments on the platform are processed in Indian Rupees (₹). Freelancers are responsible for reporting their earnings and paying applicable taxes in accordance with Indian tax law.",
    ],
  },
  {
    icon: Scale,
    title: "5. Intellectual Property",
    content: [
      "Unless otherwise agreed in writing between the client and freelancer, all intellectual property rights in work product are transferred to the client upon full payment through the escrow system.",
      "Freelancers retain the right to display completed work in their portfolio unless the client explicitly requests confidentiality at the time of job posting. Any NDA or confidentiality requirements must be stated upfront.",
      "By uploading content to ERUKA — including profile information, portfolio samples, and job descriptions — you grant ERUKA a non-exclusive, worldwide licence to display and distribute that content as necessary to operate the platform.",
      "You must not upload or submit any content that infringes on the intellectual property rights of third parties. ERUKA responds to valid DMCA takedown notices and may terminate accounts of repeat infringers.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "6. Limitation of Liability",
    content: [
      'ERUKA provides the platform "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      "ERUKA is not responsible for the quality, legality, or timeliness of work delivered by freelancers, nor for the accuracy of job descriptions posted by clients. Users engage with each other at their own risk.",
      "To the maximum extent permitted by law, ERUKA's total liability to any user for all claims arising out of or relating to the use of the platform shall not exceed the amount of fees paid by that user to ERUKA in the twelve (12) months preceding the claim.",
      "ERUKA shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, regardless of the theory of liability.",
    ],
  },
  {
    icon: ShieldOff,
    title: "7. Termination",
    content: [
      "You may deactivate your account at any time through your account settings. Upon deactivation, your profile will no longer be visible, but data may be retained as required by law or for legitimate business purposes.",
      "ERUKA may suspend or terminate your account at its sole discretion if you violate these terms, engage in fraudulent activity, receive repeated negative reviews indicating bad-faith behaviour, or fail to respond to disputes.",
      "Upon termination, any pending escrow funds will be handled according to the circumstances: funds for unstarted projects are returned to the client; disputed funds are resolved through our mediation process.",
      "Provisions of these terms that by their nature should survive termination — including intellectual property rights, limitations of liability, indemnification, and dispute resolution — shall continue to apply after your account is terminated.",
      "For any questions regarding these Terms of Service, please contact us at legal@eruka.in.",
    ],
  },
];

function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileText className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          These terms govern your use of the ERUKA platform. Please read them carefully before using
          our services.
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">Effective: 1 June 2026</p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                </div>
                <ul className="space-y-3 pl-12">
                  {section.content.map((paragraph, idx) => (
                    <li key={idx} className="text-sm leading-relaxed text-muted-foreground">
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
