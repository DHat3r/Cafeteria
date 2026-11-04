-- CreateTable
CREATE TABLE "Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "correoCifrado" TEXT,
    "correoHmac" TEXT,
    "telefonoCifrado" TEXT,
    "telefonoHmac" TEXT,
    "consentimientoEn" DATETIME NOT NULL,
    "bajaEn" DATETIME,
    "tokenBaja" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Importacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "archivo" TEXT NOT NULL,
    "filasLeidas" INTEGER NOT NULL,
    "importadas" INTEGER NOT NULL,
    "duplicadas" INTEGER NOT NULL,
    "conError" INTEGER NOT NULL,
    "asociadas" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "idExterno" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "producto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL,
    "correoHmac" TEXT,
    "telefonoHmac" TEXT,
    "clienteId" INTEGER,
    "importacionId" INTEGER NOT NULL,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Venta_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "Importacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapeoColumnas" (
    "fuente" TEXT NOT NULL PRIMARY KEY,
    "mapeo" TEXT NOT NULL,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "enviados" INTEGER NOT NULL,
    "fallidos" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_correoHmac_key" ON "Cliente"("correoHmac");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefonoHmac_key" ON "Cliente"("telefonoHmac");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_tokenBaja_key" ON "Cliente"("tokenBaja");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_idExterno_key" ON "Venta"("idExterno");

-- CreateIndex
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");

-- CreateIndex
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");

-- CreateIndex
CREATE INDEX "Venta_correoHmac_idx" ON "Venta"("correoHmac");

-- CreateIndex
CREATE INDEX "Venta_telefonoHmac_idx" ON "Venta"("telefonoHmac");
