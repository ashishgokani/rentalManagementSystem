const fs = require('fs');
const path = require('path');

const replacements = {
    'first_name': 'firstName',
    'last_name': 'lastName',
    'company_name': 'companyName',
    'business_category': 'businessCategory',
    'postal_code': 'postalCode',
    'is_active': 'isActive',
    'price_per_day': 'pricePerDay',
    'vendor_id': 'vendorId',
    'category_id': 'categoryId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'order_id': 'orderId',
    'product_id': 'productId',
    'customer_id': 'customerId',
    'total_amount': 'totalAmount',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'unit_price': 'unitPrice',
    'tax_amount': 'taxAmount',
    'issued_at': 'issuedAt',
    'access_token': 'token', // Important: The frontend might be expecting access_token. Let's map it to token or accessToken. I'll use accessToken.
    'refresh_token': 'refreshToken',
    'token_type': 'tokenType',
    'phone_number': 'phoneNumber',
    'referral_code': 'referralCode',
    'is_calendar_connected': 'isCalendarConnected',
    'profile_photo': 'profilePhoto',
    'quotation_id': 'quotationId'
};

const regexes = Object.keys(replacements).map(key => ({
    regex: new RegExp(`\\b${key}\\b`, 'g'),
    replacement: replacements[key]
}));

// We also need to map access_token -> accessToken
const tokenRegex = new RegExp(`\\baccess_token\\b`, 'g');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    for (const { regex, replacement } of regexes) {
        content = content.replace(regex, replacement);
    }
    content = content.replace(tokenRegex, 'accessToken');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            processFile(filePath);
        }
    }
}

walkDir(path.join(__dirname, 'frontend', 'src'));
console.log("Finished converting properties to camelCase.");
