const sql = require("mssql");

module.exports = async function (context, req) {
  try {
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

    // ✅ جلب جميع الفصول بدون تكرار
    const result = await pool.request().query(`
      SELECT DISTINCT Class
      FROM Students
      ORDER BY Class
    `);

    const classes = result.recordset.map(r => r.Class);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        classes
      })
    };

  } catch (err) {
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
``
