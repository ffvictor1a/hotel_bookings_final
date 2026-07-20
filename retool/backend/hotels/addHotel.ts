type RoomTypeEntry = {
  room_type: string
  total_allotment: number
  price_per_night: number
  deadline: string
}

type Params = {
  hotel_name: string
  location: string
  phone: string
  stars: number | null
  room_types: RoomTypeEntry[]
}

export default async function (req: { params: Params; user: User }) {
  const { hotel_name, location, phone, stars, room_types } = req.params

  // 1. Create hotels table if it doesn't exist
  await retoolDb.query(`
    CREATE TABLE IF NOT EXISTS hotels (
      id         SERIAL PRIMARY KEY,
      hotel_name TEXT NOT NULL,
      location   TEXT,
      phone      TEXT,
      stars      INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)

  // 2. Ensure location and phone are TEXT — the production database may have
  //    these columns typed as BOOLEAN (copied from the allotments schema).
  //    ALTER TABLE … TYPE TEXT is idempotent when the column is already TEXT.
  await retoolDb.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'hotels'
          AND column_name  = 'location'
          AND data_type   <> 'text'
      ) THEN
        ALTER TABLE hotels
          ALTER COLUMN location TYPE TEXT USING location::TEXT;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'hotels'
          AND column_name  = 'phone'
          AND data_type   <> 'text'
      ) THEN
        ALTER TABLE hotels
          ALTER COLUMN phone TYPE TEXT USING phone::TEXT;
      END IF;
    END $$;
  `)

  // 3. Insert the hotel record
  const hotelResult = await retoolDb.query<{ id: number }>(
    `INSERT INTO hotels (hotel_name, location, phone, stars)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [hotel_name, location || null, phone || null, stars ?? null]
  )

  // 4. Insert each room type into allotments.
  //    allotments.id has no sequence, so compute it as MAX(id) + 1.
  for (const rt of room_types) {
    await retoolDb.query(
      `INSERT INTO allotments (id, hotel, room_type, total_allotment, price_per_night, deadline)
       VALUES (
         (SELECT COALESCE(MAX(id), 0) + 1 FROM allotments),
         $1, $2, $3, $4, $5
       )`,
      [
        hotel_name,
        rt.room_type,
        Number(rt.total_allotment),
        Math.round(Number(rt.price_per_night)),
        rt.deadline,
      ]
    )
  }

  return { success: true, hotel_id: hotelResult.data[0]?.id ?? null }
}
