import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SMART_TOKENS, SmartTokenKey, isSmartToken } from "@/lib/docgen/smartTokens";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SmartTokenData {
  agency: Record<string, string | null>;
  collaborator: Record<string, string | null> | null;
  dirigeant: Record<string, string | null> | null;
  user: Record<string, string | null>;
  date: Record<string, string>;
}

export interface ResolvedSmartToken {
  token: string;
  label: string;
  value: string | null;
  source: string;
  category: "agence" | "collaborateur" | "dirigeant" | "user" | "date";
  editPath?: string; // Path to edit this data
}

/**
 * Fetch and resolve all smart token values for a document instance
 */
export function useSmartTokenValues(agencyId: string, collaboratorId?: string | null) {
  const { user, agencyId: userAgencyId } = useAuth();
  
  const effectiveAgencyId = agencyId || userAgencyId;

  return useQuery({
    queryKey: ["smart-token-values", effectiveAgencyId, collaboratorId],
    queryFn: async (): Promise<SmartTokenData> => {
      // Fetch agency data
      const { data: agency } = await supabase
        .from("apogee_agencies")
        .select("label, adresse, code_postal, ville, contact_email, contact_phone")
        .eq("id", effectiveAgencyId!)
        .single();

      // Fetch dirigeant (N2 user of the agency)
      const { data: dirigeantProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("agency_id", effectiveAgencyId!)
        .eq("global_role", "franchisee_admin")
        .limit(1)
        .maybeSingle();

      // Fetch collaborator if specified
      let collaborator = null;
      if (collaboratorId) {
        const { data: collabData } = await supabase
          .from("collaborators")
          .select("first_name, last_name, email, phone, street, postal_code, city, role, hiring_date")
          .eq("id", collaboratorId)
          .single();
        
        if (collabData) {
          collaborator = {
            first_name: collabData.first_name,
            last_name: collabData.last_name,
            full_name: `${collabData.first_name} ${collabData.last_name}`,
            email: collabData.email,
            phone: collabData.phone,
            address: collabData.street,
            postal_code: collabData.postal_code,
            city: collabData.city,
            role: collabData.role,
            hiring_date: collabData.hiring_date 
              ? format(new Date(collabData.hiring_date), "dd/MM/yyyy")
              : null,
          };
        }
      }

      // Get current user data
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user?.id)
        .single();

      // Date values
      const now = new Date();
      const dateValues = {
        day: format(now, "d"),
        month: format(now, "MMMM", { locale: fr }),
        year: format(now, "yyyy"),
        full: format(now, "d MMMM yyyy", { locale: fr }),
      };

      return {
        agency: {
          label: agency?.label || null,
          adresse: agency?.adresse || null,
          code_postal: agency?.code_postal || null,
          ville: agency?.ville || null,
          contact_email: agency?.contact_email || null,
          contact_phone: agency?.contact_phone || null,
        },
        collaborator,
        dirigeant: dirigeantProfile ? {
          first_name: dirigeantProfile.first_name,
          last_name: dirigeantProfile.last_name,
          full_name: `${dirigeantProfile.first_name} ${dirigeantProfile.last_name}`,
        } : null,
        user: {
          first_name: userProfile?.first_name || null,
          last_name: userProfile?.last_name || null,
          email: userProfile?.email || null,
        },
        date: dateValues,
      };
    },
    enabled: !!effectiveAgencyId && !!user,
  });
}

/**
 * Resolve a single smart token value from the data
 */
function resolveTokenValue(token: string, data: SmartTokenData): string | null {
  const info = SMART_TOKENS[token as SmartTokenKey];
  if (!info) return null;

  const [category, field] = info.source.split(".");
  
  switch (category) {
    case "agency":
      return data.agency[field] || null;
    case "collaborator":
      return data.collaborator?.[field] || null;
    case "dirigeant":
      return data.dirigeant?.[field] || null;
    case "user":
      return data.user[field] || null;
    case "date":
      return data.date[field] || null;
    default:
      return null;
  }
}

/**
 * Get all resolved smart tokens with their values and completeness status
 */
export function resolveSmartTokens(
  tokens: string[],
  data: SmartTokenData | undefined
): ResolvedSmartToken[] {
  if (!data) return [];

  return tokens
    .filter(isSmartToken)
    .map((token) => {
      const info = SMART_TOKENS[token as SmartTokenKey];
      if (!info) return null;

      const [category] = info.source.split(".");
      const value = resolveTokenValue(token, data);

      let editPath: string | undefined;
      let categoryLabel: ResolvedSmartToken["category"] = "date";

      switch (category) {
        case "agency":
          categoryLabel = "agence";
          editPath = "/settings/agency"; // or relevant path
          break;
        case "collaborator":
          categoryLabel = "collaborateur";
          // /rh/suivi supports inline editing of all collaborator fields including sensitive data
          editPath = "/rh/suivi";
          break;
        case "dirigeant":
          categoryLabel = "dirigeant";
          editPath = "/settings/profile";
          break;
        case "user":
          categoryLabel = "user";
          editPath = "/settings/profile";
          break;
        case "date":
          categoryLabel = "date";
          break;
      }

      return {
        token,
        label: info.label,
        value,
        source: info.source,
        category: categoryLabel,
        editPath,
      };
    })
    .filter(Boolean) as ResolvedSmartToken[];
}

/**
 * Group resolved tokens by category
 */
export function groupTokensByCategory(tokens: ResolvedSmartToken[]): Record<string, ResolvedSmartToken[]> {
  const groups: Record<string, ResolvedSmartToken[]> = {};
  
  for (const token of tokens) {
    if (!groups[token.category]) {
      groups[token.category] = [];
    }
    groups[token.category].push(token);
  }
  
  return groups;
}

/**
 * Get completeness stats
 */
export function getCompletenessStats(tokens: ResolvedSmartToken[]) {
  const total = tokens.filter(t => t.category !== "date").length; // Dates are always filled
  const filled = tokens.filter(t => t.category !== "date" && t.value).length;
  const missing = total - filled;
  const percentage = total > 0 ? Math.round((filled / total) * 100) : 100;
  
  return { total, filled, missing, percentage };
}
