const db = require('c:\\Users\\Admsica\\Documents\\sicamet-app\\backend\\bd.js');

async function run() {
    try {
        const [tables] = await db.query("SHOW TABLES");
        for (let t of tables) {
            let name = Object.values(t)[0];
            const [desc] = await db.query(`DESCRIBE ${name}`);
            console.log(`\n=== Table: ${name} ===`);
            desc.forEach(c => console.log(`${c.Field} | ${c.Type}`));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
