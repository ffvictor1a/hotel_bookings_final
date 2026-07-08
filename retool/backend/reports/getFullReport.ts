export default async function (_req: { params: Record<string, never>; user: User }) {
  const result = await retoolDb.query(
    `SELECT * FROM "bookingsData" ORDER BY created_at DESC`
  )
  return result.data
}
