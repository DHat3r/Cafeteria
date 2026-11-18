-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "tokenTarjeta" TEXT;

-- Relleno de los clientes que ya existen: 24 bytes aleatorios (192 bits) en hexadecimal.
UPDATE "Cliente" SET "tokenTarjeta" = lower(hex(randomblob(24))) WHERE "tokenTarjeta" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tokenTarjeta_key" ON "Cliente"("tokenTarjeta");
