const sql = require("mssql");

module.exports = async function (context, req) {
  try {
    const { className, date, absentees } = req.body;

    if (!className || !date || !Array.isArray(absentees)) {
      context.res = {
        status: 400,
        body: { success: false, error: "بيانات غير مكتملة" }
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

    // حذف تسجيلات اليوم السابقة
    await pool.request()
      .input("class", sql.NVarChar, className)
      .input("date", sql.Date, date)
      .query(`
        DELETE FROM Attendance
        WHERE Class = @class AND AttendanceDate = @date
      `);

    // إدخال الغائبين فقط
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
      body: {
        success: true,
        message: "تم حفظ الغياب بنجاح",
        absentCount: absentees.length
      }
    };
    return;

  } catch (err) {
    context.res = {
      status: 500,
      body: { success: false, error: err.message }
    };
  }
};
