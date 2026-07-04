import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { host, port, user, pass, from, secure, to } = await req.json();

    if (!host || !user || !pass || !from || !to) {
      return NextResponse.json(
        { error: 'Configurações SMTP incompletas para envio do teste. Preencha host, usuário, senha, remetente e destinatário.' },
        { status: 400 }
      );
    }

    const portNum = parseInt(port, 10) || 587;

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

    const testEmailHtml = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; padding: 12px; background-color: #e4a232; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 20px;">
              ⛪ Teste SMTP
            </div>
          </div>
          
          <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 16px; text-align: center; letter-spacing: -0.025em;">
            Teste de Conexão SMTP com Sucesso!
          </h2>
          
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            Olá! Este é um e-mail de teste enviado pelo <strong>Painel de Configurações</strong> da sua aplicação de gestão de igrejas.
          </p>
          
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
            Se você recebeu este e-mail, significa que as configurações do seu servidor SMTP estão <strong>perfeitas e funcionando perfeitamente!</strong> Agora a sua igreja pode enviar notificações, relatórios e e-mails de recuperação de senha com segurança.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin: 24px 0; font-size: 13px; color: #334155;">
            <strong>Detalhes do Servidor Testado:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.5;">
              <li><strong>Host:</strong> ${host}</li>
              <li><strong>Porta:</strong> ${portNum}</li>
              <li><strong>Remetente:</strong> ${from}</li>
              <li><strong>Segurança (SSL/TLS):</strong> ${secure ? 'Habilitada' : 'Desabilitada'}</li>
            </ul>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Este é um e-mail de teste automático. Não é necessário responder.
          </div>
        </div>
      </div>
    `;

    // Verify connection first to fail fast if config is wrong
    await transporter.verify();

    // Send the email
    await transporter.sendMail({
      from: `"Teste de SMTP Igreja" <${from}>`,
      to,
      subject: '⛪ Teste de Envio SMTP - Configurações de Servidor',
      html: testEmailHtml,
    });

    return NextResponse.json({ success: true, message: 'E-mail de teste enviado com sucesso!' });
  } catch (error: any) {
    console.error('SMTP testing error:', error);
    return NextResponse.json(
      { error: `Erro na validação/envio do SMTP: ${error.message || error}` },
      { status: 500 }
    );
  }
}
