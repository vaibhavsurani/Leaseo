# Leaseo

Leaseo is a modern, comprehensive rental marketplace platform built with [Next.js 16](https://nextjs.org/). It facilitates seamless interactions between vendors and customers for renting goods and services, featuring robust order management, inventory tracking, and financial reporting.

## 🚀 Features

### For Vendors
- **Dashboard**: Real-time overview of revenue, active rentals, and order status.
- **Product Management**: Create and manage rental products with variant support (attributes like size, color).
- **Order Management**: Process rental orders, track status (Draft -> Confirmed -> In Progress -> Completed).
- **Inventory Tracking**: Monitor stock levels across different states (In Warehouse, With Customer, Maintenance).
- **Financials**: Generate invoices and track payments.
- **Reports**: View detailed analytics on business performance.

### For Customers
- **Browse & Search**: Find products available for rent.
- **Quotations**: Request quotes for bulk or custom rental periods.
- **Rental Tracking**: Track active rentals and return schedules.

### Core Platform
- **Authentication**: Secure role-based access (Admin, Vendor, Customer) using NextAuth.js.
- **Database**: PostgreSQL with Prisma ORM for reliable data management.
- **UI/UX**: Modern, responsive interface built with Tailwind CSS v4 and Radix UI.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://authjs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/), [Shadcn UI](https://ui.shadcn.com/) implementation
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Image Storage**: Cloudinary

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Leaseo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/leaseo"

   # Authentication
   AUTH_SECRET="your-generated-secret"

   # Cloudinary (for image uploads)
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

4. **Database Setup**
   Push the schema to your database:
   ```bash
   npx prisma db push
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📜 Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint checks.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
