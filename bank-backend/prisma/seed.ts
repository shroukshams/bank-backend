import { PrismaClient, AccountType, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@bank.com" },
    update: {},
    create: {
      email: "admin@bank.com",
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // Create customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { email: "john.doe@email.com" },
      update: {},
      create: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@email.com",
        phone: "+1-555-0101",
        address: "123 Main Street, New York",
        nationalId: "NAT001",
        dateOfBirth: new Date("1985-03-15"),
      },
    }),
    prisma.customer.upsert({
      where: { email: "jane.smith@email.com" },
      update: {},
      create: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@email.com",
        phone: "+1-555-0102",
        address: "456 Oak Avenue, Los Angeles",
        nationalId: "NAT002",
        dateOfBirth: new Date("1990-07-22"),
      },
    }),
    prisma.customer.upsert({
      where: { email: "tech@corp.com" },
      update: {},
      create: {
        firstName: "Tech",
        lastName: "Corp Inc",
        email: "tech@corp.com",
        phone: "+1-555-0103",
        address: "789 Business Park, Chicago",
        nationalId: "NAT003",
      },
    }),
    prisma.customer.upsert({
      where: { email: "sarah.johnson@email.com" },
      update: {},
      create: {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1-555-0104",
        address: "321 Elm Street, Houston",
        nationalId: "NAT004",
        dateOfBirth: new Date("1992-11-08"),
      },
    }),
    prisma.customer.upsert({
      where: { email: "global@trading.com" },
      update: {},
      create: {
        firstName: "Global",
        lastName: "Trading LLC",
        email: "global@trading.com",
        phone: "+1-555-0105",
        address: "555 Commerce Blvd, Miami",
        nationalId: "NAT005",
      },
    }),
  ]);

  // Create accounts
  const accounts = await Promise.all([
    prisma.account.upsert({
      where: { accountNumber: "ACC001" },
      update: {},
      create: {
        accountNumber: "ACC001",
        type: AccountType.SAVINGS,
        balance: 15000,
        branch: "Main Street",
        customerId: customers[0].id,
      },
    }),
    prisma.account.upsert({
      where: { accountNumber: "ACC002" },
      update: {},
      create: {
        accountNumber: "ACC002",
        type: AccountType.CURRENT,
        balance: 45000,
        branch: "Downtown",
        customerId: customers[1].id,
      },
    }),
    prisma.account.upsert({
      where: { accountNumber: "ACC003" },
      update: {},
      create: {
        accountNumber: "ACC003",
        type: AccountType.BUSINESS,
        balance: 125000,
        branch: "Business Park",
        customerId: customers[2].id,
      },
    }),
    prisma.account.upsert({
      where: { accountNumber: "ACC004" },
      update: {},
      create: {
        accountNumber: "ACC004",
        type: AccountType.SAVINGS,
        balance: 8500,
        branch: "Main Street",
        status: "INACTIVE",
        customerId: customers[3].id,
      },
    }),
    prisma.account.upsert({
      where: { accountNumber: "ACC005" },
      update: {},
      create: {
        accountNumber: "ACC005",
        type: AccountType.BUSINESS,
        balance: 250000,
        branch: "Downtown",
        customerId: customers[4].id,
      },
    }),
  ]);

  // Create transactions
  const txData = [
    { ref: "TXN001", type: TransactionType.DEPOSIT, amount: 5000, toId: accounts[0].id, desc: "Initial deposit" },
    { ref: "TXN002", type: TransactionType.WITHDRAWAL, amount: 1200, fromId: accounts[0].id, desc: "ATM withdrawal" },
    { ref: "TXN003", type: TransactionType.TRANSFER, amount: 3000, fromId: accounts[1].id, toId: accounts[0].id, desc: "Transfer to savings" },
    { ref: "TXN004", type: TransactionType.DEPOSIT, amount: 10000, toId: accounts[2].id, desc: "Business income" },
    { ref: "TXN005", type: TransactionType.WITHDRAWAL, amount: 2500, fromId: accounts[2].id, desc: "Office rent" },
    { ref: "TXN006", type: TransactionType.DEPOSIT, amount: 50000, toId: accounts[4].id, desc: "Investment capital" },
    { ref: "TXN007", type: TransactionType.TRANSFER, amount: 15000, fromId: accounts[4].id, toId: accounts[2].id, desc: "Inter-business transfer" },
    { ref: "TXN008", type: TransactionType.DEPOSIT, amount: 2000, toId: accounts[3].id, desc: "Salary deposit" },
  ];

  for (const tx of txData) {
    await prisma.transaction.upsert({
      where: { reference: tx.ref },
      update: {},
      create: {
        reference: tx.ref,
        type: tx.type,
        amount: tx.amount,
        description: tx.desc,
        fromAccountId: tx.fromId ?? null,
        toAccountId: tx.toId ?? null,
      },
    });
  }

  console.log("✅ Seeding complete!");
  console.log("👤 Admin login: admin@bank.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
