const sql = require("mssql");

module.exports = async function (context, req) {
  try {
    const className = req.query.class;
    const date = req.query.date;

    if (!className || !date) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "الفصل والتاريخ مطلوبان"
        })
      };
      return;
    }

    const pool = await sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    });

    // ✅ إجمالي عدد الطلاب في الفصل
    const totalResult = await pool.request()
      .input("class", sql.NVarChar, className)
      .query(`
        SELECT COUNT(DISTINCT Name) AS Total
        FROM Students
        WHERE Class = @class
      `);

    const totalStudents = totalResult.recordset[0].Total;

    // ✅ الغائبون في هذا اليوم
    const absentResult = await pool.request()
      .input("class", sql.NVarChar, className)
      .input("date", sql.Date, date)
      .query(`
        SELECT StudentName
        FROM Attendance
        WHERE Class = @class
          AND AttendanceDate = @date
          AND IsAbsent = 1
        ORDER BY StudentName
      `);

    const absentees = absentResult.recordset.map(x => x.StudentName);
    const absentCount = absentees.length;
    const presentCount = totalStudents - absentCount;

    // ✅ الرد النهائي
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        className,
        date,
        total: totalStudents,
        present: presentCount,
        absent: absentCount,
        absentees
      })
    };
    return;

  } catch (err) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
    return;
  }
};
