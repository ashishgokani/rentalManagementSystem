require('dotenv').config();
const prisma = require('./src/config/prisma');
const bcrypt = require('bcryptjs');

const getPasswordHash = async (password) => {
    return await bcrypt.hash(password, 10);
};

const main = async () => {
    console.log("Clearing existing data...");
    
    // Clear in order
    await prisma.walletTransaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoiceLine.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.orderLine.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.quotationLine.deleteMany({});
    await prisma.quotation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    console.log("Seeding users...");

    const customerHash = await getPasswordHash("customer123");
    const vendorHash = await getPasswordHash("vendor123");
    const adminHash = await getPasswordHash("admin123");

    // Admin user
    const admin = await prisma.user.create({
        data: {
            firstName: "Admin",
            lastName: "User",
            email: "admin@example.com",
            phone: "9876543210",
            passwordHash: adminHash,
            role: "ADMIN",
            isActive: true,
            address: "123 Admin St",
            city: "Mumbai",
            state: "Maharashtra",
            postalCode: "400001",
            country: "India"
        }
    });

    // Vendor users
    const vendorsData = [
        {
            firstName: "Aditya",
            lastName: "Kulkarni",
            email: "kulkarni@trekrentals.com",
            phone: "9876543211",
            companyName: "Kulkarni Trekking & Outdoors",
            businessCategory: "Trekking & Camping",
            gstin: "27AABCU9603R1ZM",
            address: "45 Adventure Hub",
            city: "Pune",
            state: "Maharashtra",
            postalCode: "411001"
        },
        {
            firstName: "Priya",
            lastName: "Sharma",
            email: "priya@eventrentals.com",
            phone: "9876543212",
            companyName: "Sharma Event Supplies",
            businessCategory: "Events & Parties",
            gstin: "29AADCS1234F1ZN",
            address: "12 Celebration Plaza",
            city: "Bangalore",
            state: "Karnataka",
            postalCode: "560001"
        },
        {
            firstName: "Vikram",
            lastName: "Lensman",
            email: "vikram@camerarentals.com",
            phone: "9876543213",
            companyName: "ProCam Rentals",
            businessCategory: "Photography",
            gstin: "33AABCA5678G1ZO",
            address: "78 Studio Lane",
            city: "Hyderabad",
            state: "Telangana",
            postalCode: "500001"
        },
        {
            firstName: "Anita",
            lastName: "Patel",
            email: "anita@partyrentals.com",
            phone: "9876543214",
            companyName: "City Daily Rentals",
            businessCategory: "General Utilities",
            gstin: "24AABCP9012H1ZP",
            address: "90 Market Road",
            city: "Ahmedabad",
            state: "Gujarat",
            postalCode: "380001"
        }
    ];

    const vendors = [];
    for (const v of vendorsData) {
        const vendor = await prisma.user.create({
            data: {
                ...v,
                passwordHash: vendorHash,
                role: "VENDOR",
                isActive: true,
                country: "India"
            }
        });
        vendors.push(vendor);
    }

    // Customer users
    const customersData = [
        { firstName: "Amit", lastName: "Singh", email: "amit@email.com", phone: "9988776655", city: "Delhi" },
        { firstName: "Sneha", lastName: "Reddy", email: "sneha@email.com", phone: "9988776656", city: "Hyderabad" },
        { firstName: "Arjun", lastName: "Kapoor", email: "arjun@email.com", phone: "9988776657", city: "Mumbai" },
        { firstName: "Deepika", lastName: "Nair", email: "deepika@email.com", phone: "9988776658", city: "Bangalore" },
        { firstName: "Suresh", lastName: "Menon", email: "suresh@email.com", phone: "9988776659", city: "Chennai" },
        { firstName: "Kavita", lastName: "Gupta", email: "kavita@email.com", phone: "9988776660", city: "Kolkata" },
    ];

    const customers = [];
    for (const c of customersData) {
        const customer = await prisma.user.create({
            data: {
                ...c,
                passwordHash: customerHash,
                role: "CUSTOMER",
                isActive: true,
                address: "Residential Complex",
                state: "State",
                postalCode: "100001",
                country: "India"
            }
        });
        customers.push(customer);
    }

    console.log("Seeding categories...");

    const categoriesData = [
        { name: "Trekking & Camping", description: "Tents, sleeping bags, backpacks, and safety gear" },
        { name: "Photography & AV", description: "Cameras, lenses, tripods, drones, and lighting" },
        { name: "Event & Party", description: "Speakers, projectors, chairs, tables, and decor" },
        { name: "Daily Utilities", description: "Tools, ladders, cleaning equipment, and appliances" },
        { name: "Holiday Equipment", description: "Suitcases, travel gear, skiing equipment, and beach gear" },
        { name: "Electronics", description: "Laptops, tablets, gaming consoles, and VR headsets" }
    ];

    const categories = [];
    for (const cat of categoriesData) {
        const category = await prisma.category.create({
            data: {
                ...cat,
                isActive: true
            }
        });
        categories.push(category);
    }

    console.log("Seeding products...");

    const productsData = [
        {
            name: "Quechua 4-Person Camping Tent",
            description: "Waterproof, wind-resistant pop-up tent. Easy installation.",
            category: "Trekking & Camping",
            vendorIdx: 0,
            rentalPriceDaily: 500,
            rentalPriceWeekly: 1500,
            costPrice: 8000,
            salesPrice: 0,
            quantity: 10,
            images: ["https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800"]
        },
        {
            name: "Trekking Rucksack 60L",
            description: "Ergonomic hiking backpack with rain cover and multiple compartments.",
            category: "Trekking & Camping",
            vendorIdx: 0,
            rentalPriceDaily: 200,
            rentalPriceWeekly: 800,
            costPrice: 4000,
            salesPrice: 0,
            quantity: 15,
            images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800"]
        },
        {
            name: "Sleeping Bag (-5°C)",
            description: "Thermal sleeping bag appropriate for himalayan treks.",
            category: "Trekking & Camping",
            vendorIdx: 0,
            rentalPriceDaily: 150,
            rentalPriceWeekly: 600,
            costPrice: 3000,
            salesPrice: 0,
            quantity: 20,
            images: ["https://images.unsplash.com/photo-1627662168806-432540623635?w=800"]
        },
        {
            name: "GoPro Hero 11 Black",
            description: "Action camera for capturing your adventures. 5.3K video.",
            category: "Photography & AV",
            vendorIdx: 0,
            rentalPriceDaily: 800,
            rentalPriceWeekly: 3500,
            costPrice: 45000,
            salesPrice: 0,
            quantity: 5,
            images: ["https://images.unsplash.com/photo-1564463836205-4d3cb77cdcf9?w=800"]
        },
        {
            name: "Sony Alpha a7 III Kit",
            description: "Full-frame mirrorless camera with 28-70mm lens. Perfect for weddings and events.",
            category: "Photography & AV",
            vendorIdx: 2,
            rentalPriceDaily: 2500,
            rentalPriceWeekly: 10000,
            costPrice: 160000,
            salesPrice: 180000,
            quantity: 4,
            images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"]
        },
        {
            name: "Canon EF 70-200mm f/2.8L",
            description: "Telephoto zoom lens. Industry standard for sports and portraits.",
            category: "Photography & AV",
            vendorIdx: 2,
            rentalPriceDaily: 1500,
            rentalPriceWeekly: 6000,
            costPrice: 140000,
            salesPrice: 0,
            quantity: 3,
            images: ["https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800"]
        },
        {
            name: "DJI Mavic Air 2 Drone",
            description: "4K Drone for aerial photography.",
            category: "Photography & AV",
            vendorIdx: 2,
            rentalPriceDaily: 2000,
            rentalPriceWeekly: 8000,
            costPrice: 80000,
            salesPrice: 0,
            quantity: 2,
            images: ["https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800"]
        },
        {
            name: "Godox SL60W Studio Light",
            description: "Continuous LED video light for content creators.",
            category: "Photography & AV",
            vendorIdx: 2,
            rentalPriceDaily: 500,
            rentalPriceWeekly: 2000,
            costPrice: 12000,
            salesPrice: 0,
            quantity: 6,
            images: ["https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?w=800"]
        },
        {
            name: "JBL PartyBox 710",
            description: "800W RMS powerful sound with built-in light show.",
            category: "Event & Party",
            vendorIdx: 1,
            rentalPriceDaily: 3000,
            rentalPriceWeekly: 12000,
            costPrice: 65000,
            salesPrice: 0,
            quantity: 4,
            images: ["https://images.unsplash.com/photo-1545665277-5937a5953929?w=800"]
        },
        {
            name: "Epson Home Cinema Projector",
            description: "1080p projector for movie nights or presentations.",
            category: "Event & Party",
            vendorIdx: 1,
            rentalPriceDaily: 1000,
            rentalPriceWeekly: 4000,
            costPrice: 60000,
            salesPrice: 0,
            quantity: 5,
            images: ["https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800"]
        },
        {
            name: "Folding Tables (6ft)",
            description: "Sturdy tables for buffet or seating.",
            category: "Event & Party",
            vendorIdx: 1,
            rentalPriceDaily: 300,
            rentalPriceWeekly: 1000,
            costPrice: 4000,
            salesPrice: 0,
            quantity: 20,
            images: ["https://images.unsplash.com/photo-1577140917170-285929cf55b7?w=800"]
        },
        {
            name: "Chiavari Gold Chairs",
            description: "Premium event chairs with cushions.",
            category: "Event & Party",
            vendorIdx: 1,
            rentalPriceDaily: 150,
            rentalPriceWeekly: 500,
            costPrice: 3000,
            salesPrice: 0,
            quantity: 50,
            images: ["https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800"]
        },
        {
            name: "Bosch Professional Drill Kit",
            description: "Impact drill with full bit set.",
            category: "Daily Utilities",
            vendorIdx: 3,
            rentalPriceHourly: 100,
            rentalPriceDaily: 400,
            rentalPriceWeekly: 1500,
            costPrice: 8000,
            salesPrice: 0,
            quantity: 8,
            images: ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800"]
        },
        {
            name: "Aluminum Extension Ladder (20ft)",
            description: "Heavy duty extendable ladder.",
            category: "Daily Utilities",
            vendorIdx: 3,
            rentalPriceHourly: 200,
            rentalPriceDaily: 600,
            rentalPriceWeekly: 2000,
            costPrice: 12000,
            salesPrice: 0,
            quantity: 4,
            images: ["https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800"]
        },
        {
            name: "Karcher High Pressure Washer",
            description: "Car and patio cleaner.",
            category: "Daily Utilities",
            vendorIdx: 3,
            rentalPriceHourly: 250,
            rentalPriceDaily: 800,
            rentalPriceWeekly: 3000,
            costPrice: 15000,
            salesPrice: 0,
            quantity: 3,
            images: ["https://images.unsplash.com/photo-1520340356584-299638b950b9?w=800"]
        },
        {
            name: "Samsonite Hard Shell Suitcase (Set of 2)",
            description: "Large and carry-on luggage set.",
            category: "Holiday Equipment",
            vendorIdx: 3,
            rentalPriceDaily: 400,
            rentalPriceWeekly: 2000,
            costPrice: 18000,
            salesPrice: 0,
            quantity: 6,
            images: ["https://images.unsplash.com/photo-1565538810643-b5bdbfe78f0d?w=800"]
        },
        {
            name: "Barbecue Grill Station",
            description: "Portable charcoal grill for picnics.",
            category: "Holiday Equipment",
            vendorIdx: 3,
            rentalPriceDaily: 500,
            rentalPriceWeekly: 2500,
            costPrice: 5000,
            salesPrice: 0,
            quantity: 5,
            images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"]
        },
        {
            name: "PlayStation 5 Console",
            description: "PS5 with 2 controllers and 3 games.",
            category: "Electronics",
            vendorIdx: 0,
            rentalPriceDaily: 1500,
            rentalPriceWeekly: 6000,
            costPrice: 55000,
            salesPrice: 0,
            quantity: 3,
            images: ["https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800"]
        },
        {
            name: "Oculus Quest 2 VR Headset",
            description: "All-in-one VR gaming headset.",
            category: "Electronics",
            vendorIdx: 0,
            rentalPriceDaily: 1200,
            rentalPriceWeekly: 5000,
            costPrice: 40000,
            salesPrice: 0,
            quantity: 2,
            images: ["https://images.unsplash.com/photo-1622979135225-d2ba269fb1bd?w=800"]
        }
    ];

    const categoryMap = {};
    categories.forEach(c => categoryMap[c.name] = c);

    const products = [];
    for (const p of productsData) {
        const cat = categoryMap[p.category];
        const vendor = vendors[p.vendorIdx];

        const product = await prisma.product.create({
            data: {
                name: p.name,
                description: p.description,
                images: p.images,
                isRentable: true,
                rentalPriceHourly: p.rentalPriceHourly || null,
                rentalPriceDaily: p.rentalPriceDaily || null,
                rentalPriceWeekly: p.rentalPriceWeekly || null,
                costPrice: p.costPrice || 0,
                salesPrice: p.salesPrice || 0,
                quantityOnHand: p.quantity,
                reservedQuantity: 0,
                isPublished: true,
                attributes: [],
                vendorId: vendor.id,
                categoryId: cat ? cat.id : null
            }
        });
        products.push(product);
    }

    console.log("Seeding wallets...");

    for (const user of [admin, ...vendors, ...customers]) {
        const initialBalance = user.role === "CUSTOMER" ? [0, 500, 1000, 2000, 5000][Math.floor(Math.random() * 5)] : 0;
        const wallet = await prisma.wallet.create({
            data: {
                userId: user.id,
                balance: initialBalance,
                currency: "INR"
            }
        });

        if (initialBalance > 0) {
            await prisma.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    transactionType: 'CREDIT',
                    amount: initialBalance,
                    balanceBefore: 0,
                    balanceAfter: initialBalance,
                    status: 'COMPLETED',
                    description: 'Initial wallet top-up'
                }
            });
        }
    }

    console.log("Seeding orders & invoices...");

    // Group products by vendor
    const vendorProducts = {};
    products.forEach(p => {
        if (!vendorProducts[p.vendorId]) vendorProducts[p.vendorId] = [];
        vendorProducts[p.vendorId].push(p);
    });

    const orderStatuses = ['DRAFT', 'CONFIRMED', 'ACTIVE', 'RETURNED', 'COMPLETED', 'CANCELLED'];

    for (const customer of customers.slice(0, 4)) {
        const numOrders = Math.floor(Math.random() * 3) + 1; // 1-3 orders
        for (let i = 0; i < numOrders; i++) {
            const vendor = vendors[Math.floor(Math.random() * vendors.length)];
            const vendorProds = vendorProducts[vendor.id] || products.slice(0, 2);
            
            const numItems = Math.min(Math.floor(Math.random() * 2) + 1, vendorProds.length);
            const selectedProds = vendorProds.slice(0, numItems);

            let subtotal = 0;
            const orderLinesData = [];

            const daysOffset = Math.floor(Math.random() * 45) - 30; // some past, some future
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + daysOffset);
            
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 2); // 2-7 days rental

            const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

            for (const prod of selectedProds) {
                const qty = Math.floor(Math.random() * 2) + 1;
                const unitPrice = prod.rentalPriceDaily || 100;
                const total = unitPrice * qty * days;
                subtotal += total;

                orderLinesData.push({
                    productId: prod.id,
                    quantity: qty,
                    startDate,
                    endDate,
                    unitPrice: total
                });
            }

            const taxRate = 18;
            const taxAmount = subtotal * (taxRate / 100);
            const totalAmount = subtotal + taxAmount;

            const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];

            const order = await prisma.order.create({
                data: {
                    customerId: customer.id,
                    status,
                    totalAmount,
                    items: {
                        create: orderLinesData
                    }
                },
                include: { items: true }
            });

            // Create Invoice for order
            if (['CONFIRMED', 'ACTIVE', 'RETURNED', 'COMPLETED'].includes(status)) {
                const paidAmount = ['ACTIVE', 'RETURNED', 'COMPLETED'].includes(status) ? totalAmount : 0;
                const invoiceStatus = paidAmount >= totalAmount ? 'PAID' : 'DRAFT';

                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
                const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                const invoiceNumber = `INV-${timestamp}-${randomSuffix}`;

                const invoice = await prisma.invoice.create({
                    data: {
                        invoiceNumber,
                        orderId: order.id,
                        customerId: customer.id,
                        status: invoiceStatus,
                        subtotal,
                        taxRate,
                        taxAmount,
                        totalAmount,
                        paidAmount,
                        dueDate: new Date(new Date().setDate(new Date().getDate() + 30))
                    }
                });

                // Create Invoice lines
                for (const line of order.items) {
                    await prisma.invoiceLine.create({
                        data: {
                            invoiceId: invoice.id,
                            description: `Rental Item Charges`,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice / line.quantity,
                            totalPrice: line.unitPrice
                        }
                    });
                }

                // Add payment record if paid
                if (paidAmount > 0) {
                    await prisma.payment.create({
                        data: {
                            invoiceId: invoice.id,
                            amount: paidAmount,
                            method: ['ONLINE', 'WALLET', 'CARD'][Math.floor(Math.random() * 3)],
                            status: 'COMPLETED',
                            transactionId: `TXN${Math.floor(Math.random() * 899999) + 100000}`
                        }
                    });
                }
            }
        }
    }

    console.log("Seeding completed successfully!");
};

main()
    .catch((e) => {
        console.error("Error seeding database:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
