import {
  BookOpen,
  Clapperboard,
  File,
  FileText,
  Layout,
  Mail,
  MessageSquare,
  Mic,
  Newspaper,
  Presentation,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Medium } from "@/db/types";

const MAP: Record<Medium, LucideIcon> = {
  Article: FileText,
  Video: Video,
  "Short / Reel": Clapperboard,
  Podcast: Mic,
  Newsletter: Newspaper,
  Email: Mail,
  "Social Post": MessageSquare,
  "Landing Page": Layout,
  Guide: BookOpen,
  Webinar: Presentation,
  Other: File,
};

interface Props {
  medium: Medium;
  size?: number;
  className?: string;
}

export default function MediumIcon({ medium, size = 14, className }: Props) {
  const Icon = MAP[medium] ?? File;
  return <Icon size={size} className={className} aria-label={medium} />;
}
