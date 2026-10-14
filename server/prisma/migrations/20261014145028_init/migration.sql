-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "seat" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "bookedBy" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Dedication" (
    "seat" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "seat" TEXT NOT NULL,
    "by" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "Booking_by_date_idx" ON "Booking"("by", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_date_slot_seat_key" ON "Booking"("date", "slot", "seat");

-- CreateIndex
CREATE INDEX "Dedication_owner_idx" ON "Dedication"("owner");

-- CreateIndex
CREATE INDEX "Release_date_idx" ON "Release"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Release_date_seat_key" ON "Release"("date", "seat");
