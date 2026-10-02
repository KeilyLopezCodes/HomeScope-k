import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

async function crearTransporter() {
  if (env.NODE_ENV !== 'production') {
    try {
      const cuenta = await nodemailer.createTestAccount();
      console.log('📧  Ethereal SMTP listo — credenciales de prueba:');
      console.log(`    Usuario: ${cuenta.user}`);
      console.log(`    Pass:    ${cuenta.pass}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: cuenta.user, pass: cuenta.pass },
      });
    } catch {
      // Ethereal no disponible (sin internet). Usar transporte nulo para no bloquear el registro.
      console.warn('📧  Ethereal no disponible. Los correos se omitirán en desarrollo.');
      return nodemailer.createTransport({ jsonTransport: true });
    }
  }

  // En producción: usa las variables de entorno reales
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

// Inicialización lazy: se crea la primera vez que se envía un correo
let _transporter = null;
async function getTransporter() {
  if (!_transporter) _transporter = await crearTransporter();
  return _transporter;
}

export const mailAdapter = {
  async send(to, subject, html) {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.MAIL_FROM ?? 'HomeScope <noreply@homescope.com>',
      to,
      subject,
      html,
    });

    if (env.NODE_ENV !== 'production') {
      console.log(`📧  Correo enviado a ${to}`);
      console.log(`    Ver en: ${nodemailer.getTestMessageUrl(info)}`);
    }
  },
};
