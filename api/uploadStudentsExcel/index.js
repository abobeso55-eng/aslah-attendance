const sql = require("mssql");
const XLSX = require("xlsx");

module.exports = async function (context, req) {

  // السماح فقط POST
  if (req.method !== "POST") {
    context.res = {
      status: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Method Not Allowed"
      })
    };
    return;
  }

  try {
    // التأكد من وجود الملف
    if (!req.body) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "لا يوجد ملف مرفوع"
        })
      };
      return;
    }

    // قراءة ملف Excel
    const workbook = XLSX.read(req.body, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // الاتصال بقاعدة البيانات
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

    let inserted = 0;
    let skipped = 0;

    // إدخال البيانات مع تجاهل المكررات
    for (const row of rows) {
      const name = row["الاسم"] ? row["الاسم"].trim() : "";
      const cls  = row["الفصل"] ? row["الفصل"].trim() : "";

      if (!name || !cls) {
        skipped++;
        continue;
      }

      try {
        await pool.request()
          .input("name", sql.NVarChar, name)
          .input("class", sql.NVarChar, cls)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM Students
              WHERE Name = @name AND Class = @class
            )
            INSERT INTO Students (Name, Class)
            VALUES (@name, @class)
          `);

        inserted++;
      } catch (e) {
        skipped++;
      }
    }

    // ✅ إرجاع JSON نهائي واضح
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "تم رفع الطلاب بنجاح",
        inserted,
        skipped
      })
    };
    return;

  } catch (err) {
    // ✅ أي خطأ يرجع JSON
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
