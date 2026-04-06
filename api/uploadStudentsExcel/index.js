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

    // ✅ 1) حذف جميع الطلاب السابقين
    await pool.request().query("DELETE FROM Students");

    let inserted = 0;

    // ✅ 2) إدخال كل الطلاب من جديد
    for (const row of rows) {
      const name = row["الاسم"] ? row["الاسم"].trim() : "";
      const cls  = row["الفصل"] ? row["الفصل"].trim() : "";

      if (!name || !cls) continue;

      await pool.request()
        .input("name", sql.NVarChar, name)
        .input("class", sql.NVarChar, cls)
        .query(`
          INSERT INTO Students (Name, Class)
          VALUES (@name, @class)
        `);

      inserted++;
    }

    // ✅ رد نجاح نهائي
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "تم مسح البيانات ورفع الطلاب بنجاح",
        inserted
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
``
