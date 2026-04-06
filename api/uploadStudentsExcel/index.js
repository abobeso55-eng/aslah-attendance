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

    // ✅ قراءة ملف Excel
    const workbook = XLSX.read(req.body, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // ✅ الاتصال بقاعدة البيانات
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

    // ✅ بدء Transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // ✅ حذف جميع الطلاب السابقين
      await new sql.Request(transaction)
        .query("DELETE FROM Students");

      let inserted = 0;

      // ✅ إدخال جميع الطلاب من ملف Excel
      for (const row of rows) {
        const name = row["الاسم"] ? row["الاسم"].trim() : "";
        const cls  = row["الفصل"] ? row["الفصل"].trim() : "";

        if (!name || !cls) continue;

        await new sql.Request(transaction)
          .input("name", sql.NVarChar, name)
          .input("class", sql.NVarChar, cls)
          .query(`
            INSERT INTO Students (Name, Class)
            VALUES (@name, @class)
          `);

        inserted++;
      }

      // ✅ تأكيد العملية
      await transaction.commit();

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

    } catch (txErr) {
      // ❌ في حال أي خطأ → تراجع كامل
      await transaction.rollback();
      throw txErr;
    }

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
