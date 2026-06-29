export interface User {
  id: string;
  name: string;
  email: string;
  role: "freelancer" | "recruiter";
  skills: string[];
  rating: number;
  avatar: string;
  bio: string;
  completedJobs: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  skills: string[];
  deadline: string;
  status: "open" | "in-progress" | "completed";
  recruiterId: string;
  recruiterName: string;
  assignedFreelancerId?: string;
  createdAt: string;
  bidsCount: number;
  category: string;
}

export interface Bid {
  id: string;
  jobId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerRating: number;
  freelancerAvatar: string;
  amount: number;
  proposal: string;
  deliveryTime: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

export const mockUsers: User[] = [
  { id: "u1", name: "Alex Chen", email: "alex@example.com", role: "freelancer", skills: ["React", "TypeScript", "Node.js"], rating: 4.9, avatar: "AC", bio: "Full-stack developer with 5+ years of experience.", completedJobs: 47 },
  { id: "u2", name: "Sarah Miller", email: "sarah@example.com", role: "recruiter", skills: [], rating: 4.8, avatar: "SM", bio: "Tech startup founder looking for talented developers.", completedJobs: 0 },
  { id: "u3", name: "James Wilson", email: "james@example.com", role: "freelancer", skills: ["Python", "Machine Learning", "Data Science"], rating: 4.7, avatar: "JW", bio: "AI/ML engineer passionate about data.", completedJobs: 32 },
  { id: "u4", name: "Maria Garcia", email: "maria@example.com", role: "freelancer", skills: ["UI/UX", "Figma", "CSS"], rating: 5.0, avatar: "MG", bio: "Award-winning designer.", completedJobs: 61 },
  { id: "u5", name: "David Park", email: "david@example.com", role: "freelancer", skills: ["React", "Vue", "Angular"], rating: 4.6, avatar: "DP", bio: "Frontend specialist.", completedJobs: 28 },
];

export const mockJobs: Job[] = [
  { id: "j1", title: "Build a Modern E-Commerce Platform", description: "We need a full-stack developer to build a modern e-commerce platform with React frontend and Node.js backend. The platform should include product catalog, shopping cart, payment integration with Stripe, user authentication, and an admin dashboard.", budgetMin: 3000, budgetMax: 5000, skills: ["React", "Node.js", "MongoDB", "Stripe"], deadline: "2026-06-15", status: "open", recruiterId: "u2", recruiterName: "Rahul Mehta", createdAt: "2026-04-28", bidsCount: 8, category: "Web Development" },
  { id: "j2", title: "AI-Powered Chatbot Development", description: "Looking for an ML engineer to develop an AI chatbot for customer support using NLP and modern transformer models. Must integrate with our existing CRM system.", budgetMin: 5000, budgetMax: 8000, skills: ["Python", "Machine Learning", "NLP", "TensorFlow"], deadline: "2026-07-01", status: "open", recruiterId: "u2", recruiterName: "Priya Sharma", createdAt: "2026-04-30", bidsCount: 5, category: "AI & ML" },
  { id: "j3", title: "Mobile App UI/UX Redesign", description: "Our fitness tracking app needs a complete UI/UX overhaul. We want a modern, clean design with smooth animations and an intuitive user flow.", budgetMin: 2000, budgetMax: 3500, skills: ["UI/UX", "Figma", "Mobile Design"], deadline: "2026-05-30", status: "open", recruiterId: "u2", recruiterName: "James Okonkwo", createdAt: "2026-05-01", bidsCount: 12, category: "Design" },
  { id: "j4", title: "WordPress Blog Migration to Next.js", description: "Migrate our existing WordPress blog with 500+ articles to a Next.js application with static site generation. Must maintain SEO rankings.", budgetMin: 1500, budgetMax: 2500, skills: ["Next.js", "WordPress", "SEO"], deadline: "2026-06-01", status: "in-progress", recruiterId: "u2", recruiterName: "Neha Gupta", createdAt: "2026-04-20", bidsCount: 6, category: "Web Development", assignedFreelancerId: "u1" },
  { id: "j5", title: "Data Pipeline for Analytics Dashboard", description: "Build a real-time data pipeline using Apache Kafka and Python to feed our analytics dashboard. Should handle 10k+ events per second.", budgetMin: 4000, budgetMax: 7000, skills: ["Python", "Kafka", "Data Engineering"], deadline: "2026-07-15", status: "open", recruiterId: "u2", recruiterName: "Arjun Verma", createdAt: "2026-05-02", bidsCount: 3, category: "Data Engineering" },
  { id: "j6", title: "Logo & Brand Identity Design", description: "Need a complete brand identity package including logo, color palette, typography, and brand guidelines for a new fintech startup.", budgetMin: 800, budgetMax: 1500, skills: ["Graphic Design", "Branding", "Illustrator"], deadline: "2026-05-20", status: "completed", recruiterId: "u2", recruiterName: "Sofia Chen", createdAt: "2026-04-10", bidsCount: 15, category: "Design", assignedFreelancerId: "u4" },
  { id: "j7", title: "React Admin Dashboard for SaaS", description: "Create a responsive admin dashboard with charts, role-based access, and audit logs for a B2B SaaS product.", budgetMin: 2500, budgetMax: 4200, skills: ["React", "TypeScript", "Recharts"], deadline: "2026-06-25", status: "open", recruiterId: "u2", recruiterName: "Karan Malhotra", createdAt: "2026-05-03", bidsCount: 4, category: "Web Development" },
  { id: "j8", title: "Computer Vision Model for Defect Detection", description: "Build and deploy a defect-detection model for manufacturing images with evaluation metrics and deployment script.", budgetMin: 6000, budgetMax: 9000, skills: ["Python", "PyTorch", "Computer Vision"], deadline: "2026-07-20", status: "open", recruiterId: "u2", recruiterName: "Divya Nair", createdAt: "2026-05-04", bidsCount: 2, category: "AI & ML" },
  { id: "j9", title: "Cross-platform Flutter Food Delivery App", description: "Need a Flutter developer to ship Android/iOS MVP with auth, cart, order tracking, and push notifications.", budgetMin: 3500, budgetMax: 5500, skills: ["Flutter", "Firebase", "REST API"], deadline: "2026-06-30", status: "open", recruiterId: "u2", recruiterName: "Rohan Desai", createdAt: "2026-05-05", bidsCount: 7, category: "Mobile" },
  { id: "j10", title: "Design System and Component Library", description: "Design and document a reusable component library in Figma with accessibility-ready interaction patterns.", budgetMin: 1800, budgetMax: 3200, skills: ["Figma", "Design System", "Accessibility"], deadline: "2026-06-10", status: "open", recruiterId: "u2", recruiterName: "Ananya Krishnan", createdAt: "2026-05-06", bidsCount: 9, category: "Design" },
  { id: "j11", title: "AWS CI/CD Pipeline Setup", description: "Set up CI/CD for staging and production with GitHub Actions, Docker, and infrastructure best practices.", budgetMin: 2800, budgetMax: 4600, skills: ["AWS", "Docker", "GitHub Actions"], deadline: "2026-06-18", status: "open", recruiterId: "u2", recruiterName: "Vikram Patel", createdAt: "2026-05-07", bidsCount: 6, category: "DevOps" },
  { id: "j12", title: "Customer Analytics Data Warehouse", description: "Create an ELT pipeline and warehouse tables for customer analytics with scheduled transformations and dashboards.", budgetMin: 4200, budgetMax: 6800, skills: ["BigQuery", "dbt", "SQL"], deadline: "2026-07-12", status: "open", recruiterId: "u2", recruiterName: "Meera Joshi", createdAt: "2026-05-08", bidsCount: 3, category: "Data Engineering" },
  { id: "j13", title: "Shopify Theme Customization", description: "Customize storefront theme, optimize mobile conversion, and integrate upsell features for a D2C brand.", budgetMin: 1500, budgetMax: 2600, skills: ["Shopify", "Liquid", "CSS"], deadline: "2026-05-28", status: "open", recruiterId: "u2", recruiterName: "Siddharth Rao", createdAt: "2026-05-08", bidsCount: 5, category: "Web Development" },
  { id: "j14", title: "Kubernetes Monitoring and Alerting", description: "Implement observability stack with Prometheus, Grafana, and alerting rules for production workloads.", budgetMin: 3000, budgetMax: 5200, skills: ["Kubernetes", "Prometheus", "Grafana"], deadline: "2026-06-22", status: "open", recruiterId: "u2", recruiterName: "Kavya Iyer", createdAt: "2026-05-09", bidsCount: 4, category: "DevOps" },
];

export const mockBids: Bid[] = [
  { id: "b1", jobId: "j1", freelancerId: "u1", freelancerName: "Alex Chen", freelancerRating: 4.9, freelancerAvatar: "AC", amount: 4200, proposal: "I have built 10+ e-commerce platforms using React and Node.js. I can deliver a production-ready solution with all requested features within 4 weeks.", deliveryTime: 28, status: "pending", createdAt: "2026-04-29" },
  { id: "b2", jobId: "j1", freelancerId: "u5", freelancerName: "David Park", freelancerRating: 4.6, freelancerAvatar: "DP", amount: 3800, proposal: "Expert frontend developer. I'll create a blazing fast, beautiful e-commerce experience. Full-stack capable with Node.js.", deliveryTime: 35, status: "pending", createdAt: "2026-04-29" },
  { id: "b3", jobId: "j2", freelancerId: "u3", freelancerName: "James Wilson", freelancerRating: 4.7, freelancerAvatar: "JW", amount: 6500, proposal: "Specialized in NLP and chatbot development. Built 5 production chatbots using transformer models. Can integrate with any CRM via API.", deliveryTime: 42, status: "pending", createdAt: "2026-05-01" },
  { id: "b4", jobId: "j3", freelancerId: "u4", freelancerName: "Maria Garcia", freelancerRating: 5.0, freelancerAvatar: "MG", amount: 2800, proposal: "Award-winning UI/UX designer with extensive mobile design experience. I'll deliver stunning mockups with interactive prototypes.", deliveryTime: 21, status: "pending", createdAt: "2026-05-01" },
  { id: "b5", jobId: "j3", freelancerId: "u1", freelancerName: "Alex Chen", freelancerRating: 4.9, freelancerAvatar: "AC", amount: 3200, proposal: "I can handle both design and implementation. Will deliver Figma designs plus coded prototypes.", deliveryTime: 25, status: "pending", createdAt: "2026-05-02" },
  { id: "b6", jobId: "j1", freelancerId: "u3", freelancerName: "James Wilson", freelancerRating: 4.7, freelancerAvatar: "JW", amount: 4500, proposal: "Full-stack Python/JS developer. Can build robust e-commerce with excellent performance.", deliveryTime: 30, status: "pending", createdAt: "2026-04-30" },
];

export const categories = ["All", "Web Development", "AI & ML", "Design", "Data Engineering", "Mobile", "DevOps"];

export function getLowestBid(jobId: string): number | null {
  const jobBids = mockBids.filter(b => b.jobId === jobId);
  if (jobBids.length === 0) return null;
  return Math.min(...jobBids.map(b => b.amount));
}
