import "server-only";

export type MetaLeadField = { name: string; values: string[] };

export type MetaLeadData = {
  id: string;
  created_time: string;
  field_data: MetaLeadField[];
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
};

/**
 * Busca os dados completos de um lead na Graph API do Meta.
 * O webhook em si só manda o `leadgen_id` — os campos preenchidos pela
 * pessoa (nome, e-mail, telefone) só vêm com essa segunda chamada,
 * autenticada com o token de acesso da Página daquela organização.
 */
export async function fetchMetaLeadData(
  leadgenId: string,
  pageAccessToken: string
): Promise<MetaLeadData | null> {
  const fields = [
    "id",
    "created_time",
    "field_data",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "form_id",
  ].join(",");

  const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=${fields}&access_token=${pageAccessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error("[meta] falha ao buscar lead na Graph API:", await response.text());
    return null;
  }

  return response.json();
}

/** Extrai um campo específico do field_data (nomes variam conforme o formulário criado no Meta). */
export function extractField(data: MetaLeadData, ...possibleNames: string[]): string | null {
  for (const field of data.field_data) {
    if (possibleNames.some((n) => field.name.toLowerCase() === n.toLowerCase())) {
      return field.values[0] ?? null;
    }
  }
  return null;
}
