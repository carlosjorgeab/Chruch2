import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const { id_evento, id_igreja, titulo_evento, data_inicio, descricao } = await req.json();

    if (!id_evento || !id_igreja || !titulo_evento) {
      return NextResponse.json({ error: 'Parâmetros necessários ausentes.' }, { status: 400 });
    }

    // 1. Fetch subscribers of this event
    const { data: inscricoes, error: inscError } = await supabase
      .from('eventos_inscricoes')
      .select(`
        id,
        tipo_participante,
        nome_visitante,
        membro:membros (
          nome,
          email
        )
      `)
      .eq('id_evento', id_evento);

    if (inscError) {
      console.error('Erro ao buscar inscritos para e-mail:', inscError);
      return NextResponse.json({ error: 'Erro ao carregar lista de inscritos.' }, { status: 500 });
    }

    if (!inscricoes || inscricoes.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum inscrito para receber e-mail.' });
    }

    // Collect valid recipients
    const recipients = inscricoes
      .map((item: any) => {
        if (item.tipo_participante === 'Membro' && item.membro?.email) {
          return {
            nome: item.membro.nome,
            email: item.membro.email,
          };
        }
        return null;
      })
      .filter((r): r is { nome: string; email: string } => r !== null);

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum inscrito com e-mail cadastrado.' });
    }

    // 2. Fetch SMTP settings from configuracoes_sistema
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
      console.warn('Configurações de SMTP incompletas. Pulando disparo de e-mail de cancelamento.');
      return NextResponse.json({ 
        success: false, 
        message: 'Disparo de e-mail de cancelamento pulado porque as configurações de SMTP estão incompletas ou ausentes.' 
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
        rejectUnauthorized: false,
      },
    });

    // Verify SMTP connection
    await transporter.verify();

    const formattedDate = data_inicio 
      ? new Date(data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '';

    // Send emails
    const emailPromises = recipients.map(async (recipient) => {
      const emailHtml = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 15px; background-color: #f8fafc; color: #1e293b;">
          <div style="background-color: #ffffff; padding: 35px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 25px;">
              <div style="display: inline-block; padding: 10px 20px; background-color: #ef4444; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
                📢 Comunicado de Cancelamento
              </div>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 15px; text-align: center;">
              Olá, ${recipient.nome}
            </h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; text-align: center;">
              Gostaríamos de informar que o evento <strong>"${titulo_evento}"</strong>, agendado para o dia <strong>${formattedDate}</strong>, foi cancelado.
            </p>

            ${descricao ? `
              <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; border-left: 4px solid #ef4444; margin-bottom: 25px;">
                <h4 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #ef4444;">Motivo do Cancelamento:</h4>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">${descricao}</p>
              </div>
            ` : ''}
            
            <p style="font-size: 13px; line-height: 1.6; color: #64748b; text-align: center; margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 20px;">
              Se você realizou algum pagamento de inscrição, por favor, entre em contato com a secretaria de sua igreja para instruções de reembolso.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8;">
            Este é um e-mail automático enviado pela plataforma. Por favor, não responda a este e-mail.
          </div>
        </div>
      `;

      return transporter.sendMail({
        from: smtpFrom || smtpUser,
        to: recipient.email,
        subject: `⚠️ CANCELADO: Evento "${titulo_evento}"`,
        html: emailHtml,
      });
    });

    await Promise.all(emailPromises);

    return NextResponse.json({ 
      success: true, 
      message: `${recipients.length} e-mails de cancelamento disparados com sucesso.` 
    });
  } catch (error: any) {
    console.error('Erro no processamento de e-mail de cancelamento:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar disparo de e-mails.' }, { status: 500 });
  }
}
