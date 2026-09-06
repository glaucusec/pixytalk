export type CurrentOrganization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: string | null;
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function getCurrentOrganization(): Promise<CurrentOrganization> {
  const response = await fetch(`${apiUrl}/organizations/current`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Your session has expired. Sign in again."
        : "We could not load your workspace.",
    );
  }

  return response.json() as Promise<CurrentOrganization>;
}
