const sql = require("mssql");

module.exports = async function (context, req) {

    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: false
        }
    };

    try {
        // الاتصال بقاعدة البيانات
        await sql.connect(config);

        // قراءة اسم الفصل من رابط الاستعلام
        const className = req.query.class;

        // استعلام SQL
        let query = "SELECT Id, Name, Class FROM Students";
        let request = new sql.Request();

        if (className) {
            query += " WHERE Class = @class";
            request.input("class", sql.NVarChar, className);
        }

        // تنفيذ الاستعلام
        const result = await request.query(query);

        // إرجاع البيانات
        context.res = {
            status: 200,
            body: result.recordset
        };

    } catch (error) {
        context.log("DB ERROR:", error);
        context.res = {
            status: 500,
            body: {
                error: "Database error",
                details: error.message
            }
        };
    }
};
