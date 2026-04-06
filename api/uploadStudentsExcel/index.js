const sql = require("mssql");
const XLSX = require("xlsx");

module.exports = async function (context, req) {

  if (req.method !== "POST") {
    context.res = {
      status: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Method Not Allowed" })
    };
    return;
  }

  try {
    if (!req.body) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "لا يوجد ملف مرفوع" })
      };
      return;
    }

    const workbook = XLSX.read(req.body, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const pool = await sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: true
      },
      requestTimeout: 30000 // ✅ مهم جدًا
    });

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = row["الاسم"] ? row["الاسم"].trim().substring(0, 200) : "";
      const cls  = row["الفصل"] ? row["الفصل"].trim().substring(0, 100) : "";

      if (!name || !cls) {
        skipped++;
        continue;
      }

      try {
        const request = new sql.Request(transaction);
        await request
          .input("name", sql.NVarChar(200), name)
          .input("class", sql.NVarChar(100), cls)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM Students
              WHERE Name = @name AND Class = @class
            )
            INSERT INTO Students (Name, Class)
            VALUES (@name, @class)
          `);

        inserted++;
      } catch {
        skipped++;
      }
    }

    await transaction.commit();

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
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err.message })
    };
    return;
  }
};
``
