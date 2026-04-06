const sql = require("mssql");
const Busboy = require("busboy");
const XLSX = require("xlsx");

module.exports = async function (context, req) {
  if (req.method !== "POST") {
    context.res = { status: 405, body: "Method Not Allowed" };
    return;
  }

  const busboy = Busboy({ headers: req.headers });
  let fileBuffer = Buffer.alloc(0);

  busboy.on("file", (name, file) => {
    file.on("data", (data) => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  busboy.on("finish", async () => {
    try {
      context.log("UPLOAD STARTED");
      if (fileBuffer.length === 0) {
        context.res = { status: 400, body: { error: "ملف غير صالح" } };
        context.log("ROWS COUNT:", rows.length);
        return;
      }

      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        options: { encrypt: true, trustServerCertificate: false }
      };

      await sql.connect(config);

      for (const row of rows) {
        if (!row["الاسم"] || !row["الفصل"]) continue;

        await new sql.Request()
          .input("name", sql.NVarChar, row["الاسم"])
          .input("class", sql.NVarChar, row["الفصل"])
          .query(`
            INSERT INTO Students (Name, Class)
            VALUES (@name, @class)
          `);
      }

      context.res = {
        status: 200,
        body: { message: "تم رفع الطلاب بنجاح" }
      };

    } catch (err) {
      context.log("ERROR:", err);
      context.res = {
        status: 500,
        body: { error: err.message }
      };
    }
  });

  req.pipe(busboy);
};
