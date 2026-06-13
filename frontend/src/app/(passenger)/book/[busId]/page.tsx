import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface BookRedirectPageProps {
  params: Promise<{ busId: string }>;
  searchParams: SearchParams;
}

function serializeSearchParams(
  params: Record<string, string | string[] | undefined>
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  return query.toString();
}

export default async function BookRedirectPage({
  params,
  searchParams,
}: BookRedirectPageProps) {
  const { busId } = await params;
  const query = serializeSearchParams(await searchParams);
  const suffix = query ? `?${query}` : "";

  redirect(`/book/${encodeURIComponent(busId)}/preferences${suffix}`);
}
