const sql = require("mssql");

module.exports = async function (context, req) {
  try {
    const date = req.query.date;

    if (!date) {
      context.res = {
        status: 400,
        body: { success: false, error: "التاريخ مطلوب" }
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

    // إجمالي الطلاب
    const totalResult = await pool.request().query(`
      SELECT COUNT(DISTINCT Name) AS Total
      FROM Students
    `);
    const totalStudents = totalResult.recordset[0].Total;

    // الغائبون في كل الفصول
    const absentResult = await pool.request()
      .input("date", sql.Date, date)
      .query(`
        SELECT Class, StudentName
        FROM Attendance
        WHERE AttendanceDate = @date
        ORDER BY Class, StudentName
      `);

    const absentees = absentResult.recordset;
    const absentCount = absentees.length;
    const presentCount = totalStudents - absentCount;

    context.res = {
      status: 200,
      body: {
        success: true,
        date,
        totalStudents,
        presentCount,
        absentCount,
        absentPercent: totalStudents > 0
          ? ((absentCount / totalStudents) * 100).toFixed(1)
          : 0,
        absentees
      }
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: { success: false, error: err.message }
    };
  }
};
