/** Reject HTTP failures so SWR can retry rather than treating outages as data. */
export async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
