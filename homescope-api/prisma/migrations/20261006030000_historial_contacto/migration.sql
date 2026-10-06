-- CreateTable
CREATE TABLE "propiedad" (
    "id" SERIAL NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "direccion" VARCHAR(300) NOT NULL,
    "precio" DECIMAL(14,2) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "operacion" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'borrador',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorito" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "propiedad_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedad_vista" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "propiedad_id" INTEGER NOT NULL,
    "visto_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propiedad_vista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversacion" (
    "id" SERIAL NOT NULL,
    "propiedad_id" INTEGER NOT NULL,
    "comprador_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "propiedad_vendedor_id_idx" ON "propiedad"("vendedor_id");

-- CreateIndex
CREATE INDEX "favorito_usuario_id_idx" ON "favorito"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorito_usuario_id_propiedad_id_key" ON "favorito"("usuario_id", "propiedad_id");

-- CreateIndex
CREATE INDEX "propiedad_vista_usuario_id_idx" ON "propiedad_vista"("usuario_id");

-- CreateIndex
CREATE INDEX "conversacion_comprador_id_idx" ON "conversacion"("comprador_id");

-- CreateIndex
CREATE INDEX "conversacion_vendedor_id_idx" ON "conversacion"("vendedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversacion_propiedad_id_comprador_id_key" ON "conversacion"("propiedad_id", "comprador_id");

-- AddForeignKey
ALTER TABLE "propiedad" ADD CONSTRAINT "propiedad_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorito" ADD CONSTRAINT "favorito_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorito" ADD CONSTRAINT "favorito_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedad_vista" ADD CONSTRAINT "propiedad_vista_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedad_vista" ADD CONSTRAINT "propiedad_vista_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
