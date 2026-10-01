import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './identidad.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Identidad
 *   description: Registro, autenticación y perfil de usuario
 */

/**
 * @openapi
 * /auth/registro:
 *   post:
 *     tags: [Identidad]
 *     summary: Registrar un nuevo usuario
 *     description: Crea la cuenta y envía un correo de verificación. La cuenta queda en estado `pendiente` hasta verificar el correo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password]
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: María López
 *               email:
 *                 type: string
 *                 format: email
 *                 example: maria@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "MiPassword123"
 *               telefono:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+502 5555-1234"
 *               rol:
 *                 type: string
 *                 enum: [comprador, vendedor]
 *                 default: comprador
 *     responses:
 *       201:
 *         description: Usuario registrado. Se envió correo de verificación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:     { type: integer }
 *                     nombre: { type: string }
 *                     email:  { type: string }
 *       409:
 *         description: El correo ya está registrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       400:
 *         description: Datos de entrada inválidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/registro', controller.registro);

/**
 * @openapi
 * /auth/verificar-correo:
 *   get:
 *     tags: [Identidad]
 *     summary: Verificar correo electrónico
 *     description: Activa la cuenta usando el token enviado por correo. El token es válido por 24 horas.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Token de verificación recibido por correo
 *     responses:
 *       200:
 *         description: Correo verificado correctamente.
 *       400:
 *         description: Token inválido o expirado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/verificar-correo', controller.verificarCorreo);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Identidad]
 *     summary: Iniciar sesión
 *     description: |
 *       Devuelve un access token (15 min) en el cuerpo y un refresh token en una cookie `httpOnly`.
 *       El access token debe enviarse en el header `Authorization: Bearer <token>`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: maria@example.com
 *               password:
 *                 type: string
 *                 example: "MiPassword123"
 *               recordar:
 *                 type: boolean
 *                 default: false
 *                 description: Si es true, el refresh token dura 30 días en lugar de 1 día.
 *     responses:
 *       200:
 *         description: Login exitoso.
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token en cookie httpOnly
 *             schema: { type: string }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:     { type: integer }
 *                     nombre: { type: string }
 *                     email:  { type: string }
 *                     rol:    { type: string }
 *       401:
 *         description: Credenciales incorrectas.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Correo no verificado o cuenta suspendida.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/login', controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Identidad]
 *     summary: Renovar access token
 *     description: |
 *       Lee el refresh token de la cookie `httpOnly`, lo invalida y emite un nuevo par de tokens (rotación).
 *       Si el refresh token ya fue usado, se revocan todas las sesiones del usuario.
 *     responses:
 *       200:
 *         description: Nuevo access token emitido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401:
 *         description: Refresh token inválido, expirado o reutilizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/refresh', controller.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Identidad]
 *     summary: Cerrar sesión
 *     description: Revoca todos los refresh tokens activos del usuario y limpia la cookie.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente.
 *       401:
 *         description: Token requerido o inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/logout', authenticate, controller.logout);

/**
 * @openapi
 * /auth/perfil:
 *   get:
 *     tags: [Identidad]
 *     summary: Obtener perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil (sin password_hash).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:                { type: integer }
 *                 nombre:            { type: string }
 *                 email:             { type: string }
 *                 telefono:          { type: string, nullable: true }
 *                 rol:               { type: string }
 *                 estado:            { type: string }
 *                 correo_verificado: { type: boolean }
 *                 creado_en:         { type: string, format: date-time }
 *       401:
 *         description: Token requerido o inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     tags: [Identidad]
 *     summary: Editar perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: María García
 *               telefono:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+502 5555-9876"
 *     responses:
 *       200:
 *         description: Perfil actualizado.
 *       400:
 *         description: Datos de entrada inválidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Token requerido o inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/perfil', authenticate, controller.getPerfil);
router.put('/perfil', authenticate, controller.updatePerfil);

/**
 * @openapi
 * /auth/recuperar:
 *   post:
 *     tags: [Identidad]
 *     summary: Solicitar recuperación de contraseña
 *     responses:
 *       501:
 *         description: No implementado aún.
 */
router.post('/recuperar', controller.solicitarRecuperacion);

/**
 * @openapi
 * /auth/recuperar/{token}:
 *   post:
 *     tags: [Identidad]
 *     summary: Restablecer contraseña con token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       501:
 *         description: No implementado aún.
 */
router.post('/recuperar/:token', controller.resetPassword);

export default router;
