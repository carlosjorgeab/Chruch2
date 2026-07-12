import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { emails, salaName, comunicadoTipo, comunicadoDescricao, arquivos, id_igreja } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum destinatário de e-mail fornecido.' });
    }

    if (!id_igreja) {
      return NextResponse.json({ error: 'ID da igreja não fornecido.' }, { status: 400 });
    }

    // 1. Fetch SMTP settings from configuracoes_sistema
    const { data: configs, error: configError } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor');

    if (configError) {
      console.error('Erro ao carregar configurações de SMTP:', configError);
      return NextResponse.json({ error: 'Erro ao carregar configurações de SMTP.' }, { status: 500 });
    }

    let smtpHost = '';
    let smtpPort = '587';
    let smtpUser = '';
    let smtpPass = '';
    let smtpFrom = '';
    let smtpSSL = 'true';

    if (configs) {
      // Try to find church-specific SMTP first
      const hasChurchSmtp = configs.some(config => config.chave === `smtp_host_${id_igreja}` && config.valor);
      
      if (hasChurchSmtp) {
        configs.forEach(config => {
          if (config.chave === `smtp_host_${id_igreja}`) smtpHost = config.valor || '';
          if (config.chave === `smtp_port_${id_igreja}`) smtpPort = config.valor || '587';
          if (config.chave === `smtp_user_${id_igreja}`) smtpUser = config.valor || '';
          if (config.chave === `smtp_pass_${id_igreja}`) smtpPass = config.valor || '';
          if (config.chave === `smtp_from_${id_igreja}`) smtpFrom = config.valor || '';
          if (config.chave === `smtp_ssl_${id_igreja}`) smtpSSL = config.valor || 'true';
        });
      } else {
        // Fallback to system-wide SMTP settings
        configs.forEach(config => {
          if (config.chave === 'smtp_host') smtpHost = config.valor || '';
          if (config.chave === 'smtp_port') smtpPort = config.valor || '587';
          if (config.chave === 'smtp_user') smtpUser = config.valor || '';
          if (config.chave === 'smtp_pass') smtpPass = config.valor || '';
          if (config.chave === 'smtp_from') smtpFrom = config.valor || '';
          if (config.chave === 'smtp_ssl') smtpSSL = config.valor || 'true';
        });
      }

      // If still empty, find any active SMTP to use as system-wide backup
      if (!smtpHost) {
        const anySmtpConfig = configs.find(config => config.chave.startsWith('smtp_host_') && config.valor);
        if (anySmtpConfig) {
          const churchIdSuffix = anySmtpConfig.chave.replace('smtp_host_', '');
          configs.forEach(config => {
            if (config.chave === `smtp_host_${churchIdSuffix}`) smtpHost = config.valor || '';
            if (config.chave === `smtp_port_${churchIdSuffix}`) smtpPort = config.valor || '587';
            if (config.chave === `smtp_user_${churchIdSuffix}`) smtpUser = config.valor || '';
            if (config.chave === `smtp_pass_${churchIdSuffix}`) smtpPass = config.valor || '';
            if (config.chave === `smtp_from_${churchIdSuffix}`) smtpFrom = config.valor || '';
            if (config.chave === `smtp_ssl_${churchIdSuffix}`) smtpSSL = config.valor || 'true';
          });
        }
      }
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP settings are incomplete. Skipping email dispatch.');
      return NextResponse.json({ 
        success: false, 
        message: 'Disparo de e-mail pulado porque as configurações de SMTP estão incompletas ou ausentes.' 
      });
    }

    const portNum = parseInt(smtpPort, 10) || 587;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: portNum,
      secure: smtpSSL === 'true' || smtpSSL === 'SSL',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents certificate self-signed issues
      },
    });

    // Verify SMTP connection
    await transporter.verify();

    // Send individual personalized emails to each parent
    const emailPromises = emails.map(async (recipient: any) => {
      const emailHtml = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 15px; background-color: #f8fafc; color: #1e293b;">
          <div style="background-color: #ffffff; padding: 35px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 25px;">
              <div style="display: inline-block; padding: 10px 20px; background-color: #10b981; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">
                👶 Módulo Kids - Comunicado
              </div>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 20px; text-align: center; letter-spacing: -0.025em;">
              Novo Comunicado Emitido
            </h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
              Olá, <strong>${recipient.parentName || 'Responsável'}</strong>.
            </p>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 16px;">
              Gostaríamos de informar que um novo comunicado foi registrado para a criança <strong>${recipient.childName}</strong> na sala <strong>${salaName || 'Kids'}</strong>:
            </p>
            
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 14px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
                Tipo: <span style="color: #10b981;">${comunicadoTipo || 'Informação'}</span>
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1e293b; font-style: italic;">
                "${comunicadoDescricao}"
              </p>
            </div>
            
            ${arquivos && arquivos.length > 0 ? `
              <div style="margin-top: 20px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #475569;">Arquivos Anexos:</p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #3b82f6;">
                  ${arquivos.map((file: any) => `
                    <li style="margin-bottom: 4px;">
                      <a href="${file.url}" target="_blank" style="text-decoration: none; color: #2563eb; font-weight: bold;">
                        ${file.name}
                      </a>
                    </li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              Este é um e-mail de notificação automático do Módulo Kids. Por favor, não responda.
            </div>
          </div>
        </div>
      `;

      return transporter.sendMail({
        from: `"${smtpFrom ? smtpFrom.split('@')[0] : 'Igreja Kids'}" <${smtpFrom || smtpUser}>`,
        to: recipient.email,
        subject: `👶 Módulo Kids: Novo comunicado de ${recipient.childName}`,
        html: emailHtml,
      });
    });

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true, message: 'Notificações por e-mail enviadas com sucesso!' });
  } catch (error: any) {
    console.error('Erro no envio de e-mails de comunicado:', error);
    return NextResponse.json({ error: `Erro ao enviar e-mails: ${error.message || error}` }, { status: 500 });
  }
}
