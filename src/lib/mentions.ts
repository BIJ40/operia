import { Block } from "@/types/block";
import { clientNavigate } from "@/lib/clientNavigate";

export interface MentionSuggestion {
  id: string;
  label: string;
  slug: string;
  categorySlug?: string;
  type: "category" | "section";
}

export function getAllMentionSuggestions(blocks: Block[]): MentionSuggestion[] {
  const suggestions: MentionSuggestion[] = [];

  // Add all categories
  const categories = blocks.filter((b) => b.type === "category");
  categories.forEach((cat) => {
    suggestions.push({
      id: cat.id,
      label: cat.title,
      slug: cat.slug,
      type: "category",
    });
  });

  // Add all sections with their parent category
  const sections = blocks.filter((b) => b.type === "section");
  sections.forEach((section) => {
    const parentCategory = categories.find((c) => c.id === section.parentId);
    if (parentCategory) {
      suggestions.push({
        id: section.id,
        label: `${parentCategory.title} → ${section.title}`,
        slug: section.slug || section.id,
        categorySlug: parentCategory.slug,
        type: "section",
      });
    } else {
      // If no parent found, still add the section
      suggestions.push({
        id: section.id,
        label: section.title,
        slug: section.slug || section.id,
        type: "section",
      });
    }
  });

  return suggestions;
}

export function navigateToMention(mention: MentionSuggestion) {
  if (mention.type === "category") {
    // Navigate to category page
    clientNavigate(`/category/${mention.slug}`);
  } else if (mention.type === "section" && mention.categorySlug) {
    // Navigate to category page and scroll to section
    clientNavigate(`/category/${mention.categorySlug}#${mention.id}`);
  }
}

