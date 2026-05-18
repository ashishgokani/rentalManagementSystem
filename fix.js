const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'backend', 'src', 'controllers');
fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace("const { PrismaClient } = require('@prisma/client');\r\nconst prisma = new PrismaClient();", "const prisma = require('../config/prisma');");
    content = content.replace("const { PrismaClient } = require('@prisma/client');\nconst prisma = new PrismaClient();", "const prisma = require('../config/prisma');");
    
    // Auth controller might have bcrypt between them
    if(file === 'auth.controller.js') {
        content = content.replace("const { PrismaClient } = require('@prisma/client');\nconst bcrypt = require('bcryptjs');\nconst jwt = require('jsonwebtoken');\n\nconst prisma = new PrismaClient();", "const bcrypt = require('bcryptjs');\nconst jwt = require('jsonwebtoken');\nconst prisma = require('../config/prisma');");
        content = content.replace("const { PrismaClient } = require('@prisma/client');\r\nconst bcrypt = require('bcryptjs');\r\nconst jwt = require('jsonwebtoken');\r\n\r\nconst prisma = new PrismaClient();", "const bcrypt = require('bcryptjs');\r\nconst jwt = require('jsonwebtoken');\r\nconst prisma = require('../config/prisma');");
    }
    
    fs.writeFileSync(filePath, content);
});

// Also update server.js to use it, wait server.js doesn't need to instantiate it if it doesn't use it directly, except maybe for health check? No, server.js doesn't query prisma. Let's just remove prisma instantiation from server.js completely!
let serverContent = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
serverContent = serverContent.replace("const { PrismaClient } = require('@prisma/client');\nconst { Pool } = require('pg');\nconst { PrismaPg } = require('@prisma/adapter-pg');\n\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\nconst adapter = new PrismaPg(pool);\nconst prisma = new PrismaClient({ adapter });", "");
serverContent = serverContent.replace("const { PrismaClient } = require('@prisma/client');\r\nconst { Pool } = require('pg');\r\nconst { PrismaPg } = require('@prisma/adapter-pg');\r\n\r\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\r\nconst adapter = new PrismaPg(pool);\r\nconst prisma = new PrismaClient({ adapter });", "");
fs.writeFileSync(path.join(__dirname, 'backend', 'server.js'), serverContent);

console.log("Fixed Prisma imports.");
