const sql = require("mssql");

module.exports = async function (context, req) {
  try {
    // ✅ Body parsing (يدعم وصول body كـ string أو object)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    // ✅ تطابق الأسماء مع الواجهة
    const { class: className, date, absentees } = body;

    // ✅ Logs حاسمة للتشخيص
    context.log("saveAttendance body:", body);
    context.log("Parsed:", { className, date, absentees });

    // ✅ تحقق صارم
    if (!className || !date || !Array.isArray(absentees)) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "بيانات غير مكتملة",
          received: { className, date, absentees },
        }),
      };
      return;
    }

    // ✅ اتصال قاعدة البيانات
    const pool = await sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    });

    // ✅ حذف تسجيلات اليوم لنفس الفصل (إعادة حفظ آمنة)
    await pool
      .request()
      .input("class", sql.NVarChar, className)
      .input("date", sql.Date, date)
      .query(`
        DELETE FROM Attendance
        WHERE [Class] = @class AND AttendanceDate = @date
      `);

    // ✅ إدخال الغائبين فقط
    // (لو كانت absentees فارغة → هذا طبيعي: لا غياب اليوم)
    for (const name of absentees) {
      await pool
        .request()
        .input("name", sql.NVarChar, name)
        .input("class", sql.NVarChar, className)
        .input("date", sql.Date, date)
        .input("absent", sql.Bit, 1)
        .query(`
          INSERT INTO Attendance (StudentName, [Class], AttendanceDate, IsAbsent)
          VALUES (@name, @class, @date, @absent)
        `);
    }

    // ✅ نجاح
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "تم حفظ الغياب بنجاح",
        class: className,
        date,
        absentCount: absentees.length,
      }),
    };
  } catch (err) {
    context.log.error("saveAttendance error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};
