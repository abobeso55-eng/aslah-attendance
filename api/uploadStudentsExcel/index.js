const sql = require("mssql");
const XLSX = require("xlsx");

module.exports = async function (context, req) {

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

    // ✅ قراءة ملف Excel مباشرة من body
    const workbook = XLSX.read(req.body, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // ✅ اتصال SQL (التعديل المهم هنا)
    const pool = await sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: true   // ✅ الحل الحاسم
      }
    });

    let inserted = 0;

    for (const row of rows) {
      if (!row["الاسم"] || !row["الفصل"]) continue;

      await pool.request()
        .input("name", sql.NVarChar, row["الاسم"])
        .input("class", sql.NVarChar, row["الفصل"])
        .query(
          "INSERT INTO Students (Name, Class) VALUES (@name, @class)"
        );

      inserted++;
    }

    // ✅ إرجاع JSON نجاح
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "تم رفع الطلاب بنجاح",
        inserted
      })
    };

  } catch (err) {
    // ✅ إرجاع JSON خطأ
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
  }
};
