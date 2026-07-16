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
  {
    id: "u1",
    name: "Alex Chen",
    email: "alex@example.com",
    role: "freelancer",
    skills: ["React", "TypeScript", "Node.js"],
    rating: 4.9,
    avatar: "AC",
    bio: "Full-stack developer with 5+ years of experience.",
    completedJobs: 47,
  },
  {
    id: "u2",
    name: "Sarah Miller",
    email: "sarah@example.com",
    role: "recruiter",
    skills: [],
    rating: 4.8,
    avatar: "SM",
    bio: "Tech startup founder looking for talented developers.",
    completedJobs: 0,
  },
  {
    id: "u3",
    name: "James Wilson",
    email: "james@example.com",
    role: "freelancer",
    skills: ["Python", "Machine Learning", "Data Science"],
    rating: 4.7,
    avatar: "JW",
    bio: "AI/ML engineer passionate about data.",
    completedJobs: 32,
  },
  {
    id: "u4",
    name: "Maria Garcia",
    email: "maria@example.com",
    role: "freelancer",
    skills: ["UI/UX", "Figma", "CSS"],
    rating: 5.0,
    avatar: "MG",
    bio: "Award-winning designer.",
    completedJobs: 61,
  },
  {
    id: "u5",
    name: "David Park",
    email: "david@example.com",
    role: "freelancer",
    skills: ["React", "Vue", "Angular"],
    rating: 4.6,
    avatar: "DP",
    bio: "Frontend specialist.",
    completedJobs: 28,
  },
];

export const mockJobs: Job[] = [];

export const mockBids: Bid[] = [];

export const categories = [
  "All",
  "Web Development",
  "AI & ML",
  "Design",
  "Data Engineering",
  "Mobile",
  "DevOps",
];

export function getLowestBid(jobId: string): number | null {
  const jobBids = mockBids.filter((b) => b.jobId === jobId);
  if (jobBids.length === 0) return null;
  return Math.min(...jobBids.map((b) => b.amount));
}
