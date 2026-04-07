const sql = require("mssql");

module.exports = async function (context, req) {
  try {
    // ✅ تحويل body من string إلى JSON
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { className, date, absentees } = body;

    if (!className || !date || !Array.isArray(absentees)) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "بيانات غير مكتملة"
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

    // ✅ حذف تسجيلات الغياب السابقة لنفس اليوم والفصل
    await pool.request()
      .input("class", sql.NVarChar, className)
      .input("date", sql.Date, date)
      .query(`
        DELETE FROM Attendance
        WHERE Class = @class AND AttendanceDate = @date
      `);

    // ✅ إدخال الغائبين فقط
    for (const name of absentees) {
      await pool.request()
        .input("name", sql.NVarChar, name)
        .input("class", sql.NVarChar, className)
        .input("date", sql.Date, date)
        .input("absent", sql.Bit, 1)
        .query(`
          INSERT INTO Attendance (StudentName, Class, AttendanceDate, IsAbsent)
          VALUES (@name, @class, @date, @absent)
        `);
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "تم حفظ الغياب بنجاح",
        absentCount: absentees.length
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
