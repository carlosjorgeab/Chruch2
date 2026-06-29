import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { host, port, user, pass, from, secure, to, code, userName } = await req.json();

    if (!host || !user || !pass || !from || !to || !code) {
      return NextResponse.json(
        { error: 'Configurações SMTP incompletas para envio.' },
        { status: 400 }
      );
    }

    const portNum = parseInt(port, 10) || 587;

    // Create custom transporter using the provided credentials
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: secure === true || secure === 'true',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents certificate self-signed issues
      },
    });

    const emailHtml = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="background-color: #ffffff; padding: 40px; rounded-corners: 16px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 12px; background-color: #3b758c; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 20px;">
              ⛪ Sistema de Igrejas
            </div>
          </div>
          
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 16px; text-align: center; letter-spacing: -0.025em;">
            Recuperação de Senha
          </h2>
          
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            Olá, <strong>${userName || 'Membro'}</strong>.
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            Recebemos uma solicitação para redefinir a sua senha de acesso. Use o código de verificação abaixo para continuar com a recuperação de sua conta:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; padding: 16px 32px; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 0.25em;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Este código é válido por 15 minutos.</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            Se você não solicitou a redefinição de sua senha, desconsidere este e-mail. Nenhuma ação adicional é necessária.
          </p>
          
          <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Este é um e-mail automático. Por favor, não responda.
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${userName || 'Sistema'}" <${from}>`,
      to,
      subject: `Código de Recuperação: ${code}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso.' });
  } catch (error: any) {
    console.error('SMTP sending error:', error);
    return NextResponse.json(
      { error: `Erro no Servidor SMTP: ${error.message || error}` },
      { status: 500 }
    );
  }
}
