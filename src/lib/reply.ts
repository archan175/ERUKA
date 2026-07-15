export function generateSmartReply(
  message: string,
  context: { role?: string; jobTitle?: string; history?: string[] } = {},
) {
  const msg = (message || "").trim();
  if (!msg) return "Could you give me a few more details so I can help?";

  const lower = msg.toLowerCase();
  const templates = {
    login: [
      "Try signing in with the email you registered. If that fails, use 'Forgot password' to reset it.",
      "If you're seeing a login error, confirm your email is correct and reset your password from the login page.",
    ],
    signup: [
      "Open Sign Up, choose Freelancer or Recruiter, fill name/email/password and submit — you'll be logged in automatically.",
      "Register from Sign Up using your email; then verify and complete your profile in the Dashboard.",
    ],
    postjob: [
      "Go to Post Job, add a clear title, description, budget, deadline and skills. Use common skill chips to add popular technologies quickly.",
      "When posting, include deliverables and milestones — that helps freelancers submit more accurate bids.",
    ],
    bid: [
      "A strong bid has: short approach, timeline, and price. Be explicit about deliverables for clarity.",
      "Include an estimated delivery date and a short plan. Breaking work into milestones increases trust.",
    ],
    budget: [
      "Consider breaking the project into milestones with payments on completion — it helps manage scope and payments.",
      "If you share a budget number I can recommend a timeline and scope that fits it.",
    ],
    profile: [
      "Edit your profile from the Dashboard (Edit Profile) — name, email and avatar update immediately.",
      "Open Dashboard → Edit Profile to change your public name, email and avatar.",
    ],
    fallback: [
      "I can help with login, signup, posting jobs, bidding and profiles. Tell me which area you need help with.",
      "Could you share one specific outcome you want (example: launch MVP, integrate payments)? I will give a concrete next step.",
    ],
  };

  // Helper to pick a template and optionally interpolate
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  // Intent detection
  if (/(login|log in|sign in|can't login|cannot login|unable to login)/.test(lower)) {
    return `${pick(templates.login)} If you'd like, tell me the exact error message and I'll guide you.`;
  }

  if (/(signup|sign up|register|create account)/.test(lower)) {
    return `${pick(templates.signup)} If you want, provide the role you plan to use and I'll suggest profile fields to fill.`;
  }

  if (/(post a job|post job|how to post|create job)/.test(lower)) {
    return `${pick(templates.postjob)} Pro tip: add 3 example deliverables to get better bids.`;
  }

  if (/(bid|apply|proposal|place a bid|how to bid)/.test(lower)) {
    return `${pick(templates.bid)} Example: "Deliver homepage + cart + checkout in 4 weeks" — short and specific works best.`;
  }

  if (/\b(₹|rs\b|inr|rupee|budget|price|amount|cost)\b/.test(lower)) {
    const num = msg.match(/\d[\d,\.\s]*/);
    if (num) {
      return `${pick(templates.budget)} (noting the amount ${num[0].trim()}).`;
    }
    return pick(templates.budget);
  }

  if (lower.includes("profile") || lower.includes("account")) {
    return pick(templates.profile);
  }

  // If it's a question starting with how/what/why/where/when
  if (lower.match(/^(how|what|why|where|when)\b/) || lower.endsWith("?")) {
    return `Good question — ${msg.replace(/\?+$/, "")}. ${pick(templates.fallback)}`;
  }

  // Use context.jobTitle if provided
  if (context.jobTitle) {
    return `About "${context.jobTitle}": ${msg}. If you share deliverables and timeline I can outline a bid or milestones.`;
  }

  // Use history to personalize (if available)
  if (context.history && context.history.length > 0) {
    const last = context.history[context.history.length - 1];
    return `Thanks for the update. Based on what you said earlier ("${last}"), ${msg}. Here's a recommended next step: provide a short milestone list.`;
  }

  // Fallback paraphrase + question
  const short = msg.length > 120 ? msg.slice(0, 117) + "..." : msg;
  return `Got it — "${short}". Can you tell me the single most important outcome for this request? I'll provide step-by-step guidance.`;
}

export default generateSmartReply;
