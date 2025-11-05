-- CreateTable
CREATE TABLE `Participante` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidos` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `twitter` VARCHAR(191) NOT NULL,
    `ocupacion` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NOT NULL,
    `aceptoTerminos` BOOLEAN NOT NULL,

    UNIQUE INDEX `Participante_email_key`(`email`),
    INDEX `Participante_nombre_apellidos_idx`(`nombre`, `apellidos`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
