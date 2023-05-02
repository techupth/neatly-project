import { Router } from "express";
import { pool } from "../utils/db.js";

const roomRouter = Router();

// ----------------------------- get maximum guests for 1 room & maximum rooms in 1 room_type ---------------------------------

roomRouter.get("/room-type/max-guests", async (req, res) => {
  // count maximum guests for 1 room
  let result1;
  try {
    result1 = await pool.query(`select max(amount_person) from rooms_type`);
  } catch {
    return res.json({
      message: "There is some error occured on the database",
    });
  }

  // count maximum rooms in 1 room_type
  let result2;
  try {
    result2 = await pool.query(`
    SELECT MAX(count)
    FROM (
      SELECT room_type_id, COUNT(*) as count
      FROM rooms
      GROUP BY room_type_id
      
    ) AS subquery;`);
  } catch {
    return res.json({
      message: "There is some error occured on the database",
    });
  }

  const maximum = {};
  maximum["guests"] = Number(result1?.rows[0].max);
  maximum["rooms"] = Number(result2?.rows[0].max);

  return res.json({
    data: maximum,
  });
});

// ---- get guest more than amount search ----

roomRouter.get("/room-type/search", async (req, res) => {
  const check_in_date = new Date(req.query.check_in_date)
    .toISOString()
    .slice(0, 10);
  const check_out_date = new Date(req.query.check_out_date)
    .toISOString()
    .slice(0, 10);
  const amount_guests = parseInt(req.query.amount_guests);

  try {
    const max_guests_per_room = await pool.query(
      `SELECT MAX(amount_person) as max_guests FROM rooms_type`
    );
    const max_guests = max_guests_per_room.rows[0].max_guests;

    const roomsTypeData = [];

    for (let guests = amount_guests; guests <= max_guests; guests++) {
      const table1 = await pool.query(
        `SELECT booking.room_id, booking_details.check_in_date, booking_details.check_out_date, rooms.room_type_id, rooms_type.amount_person
         FROM booking
         INNER JOIN booking_details ON booking_details.booking_detail_id = booking.booking_detail_id
         INNER JOIN rooms ON booking.room_id = rooms.room_id
         INNER JOIN rooms_type ON rooms.room_type_id = rooms_type.room_type_id
         WHERE rooms_type.amount_person >= $1 AND rooms_type.amount_person <= $2
         ORDER BY rooms_type.amount_person ASC`,
        [guests, max_guests]
      );

      const unAvailableRooms = table1.rows
        .filter((row) => {
          return (
            check_in_date < row.check_out_date &&
            check_out_date > row.check_in_date
          );
        })
        .map((row) => row.room_id);

      const table2 = await pool.query(
        `SELECT rooms.room_id, rooms.room_type_id, rooms_type.amount_person
        FROM rooms
        INNER JOIN rooms_type ON rooms.room_type_id = rooms_type.room_type_id
        WHERE rooms_type.amount_person >= $1 AND rooms_type.amount_person <= $2
        ORDER BY rooms_type.amount_person ASC`,
        [guests, max_guests]
      );

      const allRooms = table2.rows.map((room) => room.room_id);

      const availableRooms = allRooms.filter(
        (room) => !unAvailableRooms.includes(room)
      );

      const availableRoomType = table2.rows
        .filter((room) => availableRooms.includes(room.room_id))
        .map((room) => room.room_type_id);

      const roomsTypeForBooking = Object.entries(
        availableRoomType.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {})
      ).map(([key, value]) => [parseInt(key), value]);

      for (let i = 0; i < roomsTypeForBooking.length; i++) {
        const results = await pool.query(
          `SELECT 
            rt.*, 
            array_agg(rp.room_picture) as room_picture       
           FROM rooms_type rt
           LEFT JOIN rooms_pictures rp ON rp.room_type_id = rt.room_type_id
           WHERE rt.room_type_id = $1
           GROUP BY rt.room_type_id
           ORDER BY rt.amount_person ASC`,
          [roomsTypeForBooking[i][0]]
        );

        results.rows[0] = {
          ...results.rows[0],
          available_room: roomsTypeForBooking[i][1],
        };

        roomsTypeData.push(results.rows[0]);
      }
      roomsTypeData.sort((a, b) => a.amount_person - b.amount_person);
      return res.status(200).json({ data: roomsTypeData });
    }
  } catch (error) {
    return res.json({ message: error.message });
  }
});

// ------------------------------------------- create api get room type by type id -------------------------------------------

roomRouter.get("/room-type/:id", async (req, res) => {
  const roomTypeId = req.params.id;

  if (!roomTypeId) {
    return res.status(401).json({
      message: "Please specified post id in order to get the post",
    });
  }

  let result;

  try {
    result = await pool.query(
      `SELECT
        rt.*,
        ra.*,
        array_agg(rp.room_picture) as room_picture
      FROM rooms_type rt
      LEFT JOIN rooms_pictures rp ON rp.room_type_id = rt.room_type_id
      LEFT JOIN rooms_amenities ra ON ra.room_type_id = rt.room_type_id
      WHERE rt.room_type_id = $1
      GROUP BY
        rt.room_type_id,
        ra.room_amenity_id
      `,
      [roomTypeId]
    );
  } catch {
    return res.json({
      message: "There is some error occured on the database",
    });
  }

  const newArr = result?.rows?.[0] ?? [];

  // if need to send result for object in array
  // const newResult = []
  const temp = {
    id: newArr.room_type_id,
    safe_in_room: newArr.safe_in_room,
    air_conditioning: newArr.air_conditioning,
    high_speed_internet: newArr.high_speed_internet,
    hairdryer: newArr.hairdryer,
    shower: newArr.shower,
    bathroom_amenities: newArr.bathroom_amenities,
    lamp: newArr.lamp,
    minibar: newArr.minibar,
    telephone: newArr.telephone,
    ironing_board: newArr.ironing_board,
    floor_accessible: newArr.floor_accessible,
    alarm_clock: newArr.alarm_clock,
    bathrobe: newArr.bathrobe,
  };

  const amenityResult = [];
  for (const key in temp) {
    if (temp[key] === true) {
      amenityResult.push(key);
    }
  }

  const newResult = {
    room_type_id: newArr.room_type_id,
    room_type_name: newArr.room_type_name,
    room_size: newArr.room_size,
    bed_type: newArr.bed_type,
    amount_person: newArr.amount_person,
    description: newArr.description,
    price: newArr.price,
    promotion_price: newArr.promotion_price,
    room_amenity_id: newArr.room_amenity_id,
    room_amenity: amenityResult,
    room_picture: newArr.room_picture,
  };

  return res.json({
    data: newResult,
  });
});

export default roomRouter;
