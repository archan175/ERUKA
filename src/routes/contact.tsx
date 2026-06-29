import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — ERUKA" },
      {
        name: "description",
        content:
          "Get in touch with the ERUKA team. We're here to help with questions about our freelancing platform.",
      },
    ],
  }),
  component: ContactPage,
});

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "support@eruka.in",
    href: "mailto:support@eruka.in",
    description: "We typically respond within 24 hours",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 80-4567-8900",
    href: "tel:+918045678900",
    description: "Mon–Fri, 9 AM – 6 PM IST",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Bangalore, Karnataka",
    href: undefined,
    description: "Koramangala, Bangalore 560034",
  },
];

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);

    // Save to localStorage
    const existing = JSON.parse(
      localStorage.getItem("eruka_contact_messages") || "[]",
    );
    existing.push({ ...form, timestamp: new Date().toISOString() });
    localStorage.setItem(
      "eruka_contact_messages",
      JSON.stringify(existing),
    );

    // Simulate a brief delay
    setTimeout(() => {
      setSubmitting(false);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success("Message sent!", {
        description:
          "Thanks for reaching out. We'll get back to you within 24 hours.",
      });
    }, 600);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Toaster />

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <MessageSquare className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Have a question, feedback, or need help? We'd love to hear from
          you.
        </p>
      </div>

      {/* Contact Info Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {contactInfo.map((info) => {
          const Icon = info.icon;
          const Wrapper = info.href ? "a" : "div";
          return (
            <Card
              key={info.label}
              className="gradient-card border-border/50 transition-colors hover:border-primary/30"
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {info.label}
                </h3>
                <Wrapper
                  {...(info.href
                    ? {
                        href: info.href,
                        className:
                          "mt-1 text-sm font-medium text-primary hover:underline",
                      }
                    : {
                        className: "mt-1 text-sm font-medium text-primary",
                      })}
                >
                  {info.value}
                </Wrapper>
                <p className="mt-1 text-xs text-muted-foreground">
                  {info.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact Form */}
      <Card className="gradient-card border-border/50">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Send Us a Message
              </h2>
              <p className="text-sm text-muted-foreground">
                Fill out the form below and we'll respond as soon as possible.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="What is this regarding?"
                value={form.subject}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Tell us more about your question or feedback..."
                value={form.message}
                onChange={handleChange}
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full sm:w-auto"
              disabled={submitting}
            >
              {submitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>

          {/* Response time note */}
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Our team typically responds within 24 hours during business
              days. For urgent issues, please call us directly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
