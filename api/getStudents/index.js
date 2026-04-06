const sql = require("mssql");

module.exports = async function (context, req) {
  try {
    const className = req.query.class;

    // التحقق من وجود اسم الفصل
    if (!className) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          error: "اسم الفصل مطلوب"
        })
      };
      return;
    }

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

    // ✅ التعديل الجذري: DISTINCT لمنع التكرار
    const result = await pool.request()
      .input("class", sql.NVarChar, className)
      .query(`
        SELECT DISTINCT Name
        FROM Students
        WHERE Class = @class
        ORDER BY Name
      `);

    // إرجاع النتيجة
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        students: result.recordset
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
