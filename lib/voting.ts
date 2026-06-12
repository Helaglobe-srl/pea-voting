export function isVotingAllowedFor(email: string | undefined | null): boolean {
  if (!email) return false;

  const allowed = (process.env.VOTING_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase());
}