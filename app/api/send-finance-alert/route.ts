import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { email, igrejaId } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Informe um endereço de e-mail válido para envio das contas a pagar.' },
        { status: 400 }
      );
    }

    if (!igrejaId) {
      return NextResponse.json(
        { error: 'ID da igreja/congregação não informado.' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Fetch transactions for the church from table 'transacoes'
    const { data: transacoes, error: errTrans } = await supabase
      .from('transacoes')
      .select('*')
      .eq('id_igreja', igrejaId);

    if (errTrans) {
      return NextResponse.json(
        { error: `Erro ao buscar transações na tabela 'transacoes': ${errTrans.message}` },
        { status: 500 }
      );
    }

    // 2. Filter unpaid bills due in the next 5 days
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowZero = new Date(todayZero);
    tomorrowZero.setDate(tomorrowZero.getDate() + 1);

    const limit5Days = new Date(todayZero);
    limit5Days.setDate(limit5Days.getDate() + 5);
    limit5Days.setHours(23, 59, 59, 999);

    const pending5Days = (transacoes || []).filter((t: any) => {
      const isSaida = t.tipo === 'Saída' || t.tipo === 'DESPESA' || t.tipo === 'Débito' || t.tipo === 'Despesa';
      if (!isSaida) return false;

      const isPaid = t.data_pagamento && String(t.data_pagamento).trim() !== '';
      if (isPaid) return false;

      const dueStr = t.data_vencimento || t.data;
      if (!dueStr) return false;

      const [y, m, d] = dueStr.split('-').map(Number);
      if (!y || !m || !d) return false;
      const dueDate = new Date(y, m - 1, d);

      return dueDate <= limit5Days;
    });

    // Sort ascending by due date
    pending5Days.sort((a: any, b: any) => {
      const dA = a.data_vencimento || a.data || '';
      const dB = b.data_vencimento || b.data || '';
      return dA.localeCompare(dB);
    });

    // Separate bills due tomorrow/today (next day) vs other days
    const tomorrowBills: any[] = [];
    const otherBills: any[] = [];

    pending5Days.forEach((t: any) => {
      const dueStr = t.data_vencimento || t.data;
      const [y, m, d] = dueStr.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === tomorrowZero.getTime() || dueDate.getTime() <= todayZero.getTime()) {
        tomorrowBills.push(t);
      } else {
        otherBills.push(t);
      }
    });

    // Fetch SMTP configs from configuracoes_sistema
    const { data: configs } = await supabase
      .from('configuracoes_sistema')
      .select('*');

    let smtpHost = '';
    let smtpPort = '587';
    let smtpUser = '';
    let smtpPass = '';
    let smtpFrom = '';
    let smtpSSL = false;

    if (configs) {
      configs.forEach((c: any) => {
        if (c.chave === `smtp_host_${igrejaId}` || c.chave === 'smtp_host') if (c.valor) smtpHost = c.valor;
        if (c.chave === `smtp_port_${igrejaId}` || c.chave === 'smtp_port') if (c.valor) smtpPort = c.valor;
        if (c.chave === `smtp_user_${igrejaId}` || c.chave === 'smtp_user') if (c.valor) smtpUser = c.valor;
        if (c.chave === `smtp_pass_${igrejaId}` || c.chave === 'smtp_pass') if (c.valor) smtpPass = c.valor;
        if (c.chave === `smtp_from_${igrejaId}` || c.chave === 'smtp_from') if (c.valor) smtpFrom = c.valor;
        if (c.chave === `smtp_ssl_${igrejaId}` || c.chave === 'smtp_ssl') smtpSSL = c.valor === 'true';
      });
    }

    // Fetch Church name
    const { data: igrejaData } = await supabase
      .from('igrejas')
      .select('nome')
      .eq('id', igrejaId)
      .single();

    const churchName = igrejaData?.nome || 'Gestão Financeira da Igreja';

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { 
          error: 'Configurações SMTP não encontradas. Configure o servidor SMTP na aba "Servidores" das Configurações antes de realizar o envio.',
          billsCount: pending5Days.length,
          tomorrowCount: tomorrowBills.length
        },
        { status: 400 }
      );
    }

    const portNum = parseInt(smtpPort, 10) || 587;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: portNum,
      secure: smtpSSL,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Build HTML rows with STRONG EMPHASIS on bills due tomorrow (próximo dia)
    const tomorrowHtmlRows = tomorrowBills.map((t: any) => {
      const dueStr = t.data_vencimento || t.data;
      const [y, m, d] = dueStr.split('-').map(Number);
      const dateFormatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      const valFormatted = Number(t.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const isTodayOrPast = new Date(y, m - 1, d).setHours(0,0,0,0) <= todayZero.getTime();
      const badgeText = isTodayOrPast ? 'VENCE HOJE / ATRASADA' : '⚡ VENCE AMANHÃ (PRÓXIMO DIA)';

      return `
        <tr style="background-color: #fff7ed; border-bottom: 2px solid #fed7aa;">
          <td style="padding: 14px 16px; font-weight: bold; color: #9a3412;">
            <span style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-bottom: 4px; font-weight: 800; letter-spacing: 0.5px;">${badgeText}</span><br/>
            ${t.descricao}
          </td>
          <td style="padding: 14px 16px; color: #7c2d12; font-size: 13px;">${t.categoria || 'Despesa'}</td>
          <td style="padding: 14px 16px; color: #7c2d12; font-weight: bold; font-size: 13px;">${dateFormatted}</td>
          <td style="padding: 14px 16px; color: #c2410c; font-weight: 900; font-size: 16px; text-align: right;">R$ ${valFormatted}</td>
        </tr>
      `;
    }).join('');

    const otherHtmlRows = otherBills.map((t: any) => {
      const dueStr = t.data_vencimento || t.data;
      const [y, m, d] = dueStr.split('-').map(Number);
      const dateFormatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      const valFormatted = Number(t.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; color: #1e293b; font-weight: 600;">${t.descricao}</td>
          <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">${t.categoria || 'Despesa'}</td>
          <td style="padding: 12px 16px; color: #334155; font-size: 13px;">${dateFormatted}</td>
          <td style="padding: 12px 16px; color: #0f172a; font-weight: 800; font-size: 14px; text-align: right;">R$ ${valFormatted}</td>
        </tr>
      `;
    }).join('');

    const totalValAll = pending5Days.reduce((sum: number, t: any) => sum + (Number(t.valor) || 0), 0);
    const totalValTomorrow = tomorrowBills.reduce((sum: number, t: any) => sum + (Number(t.valor) || 0), 0);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f8fafc; color: #0f172a;">
        <div style="background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
          
          <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">${churchName}</span>
            <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 6px 0 0 0;">🔔 Relatório de Contas a Pagar (Próximos 5 Dias)</h1>
          </div>

          <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
            Resumo automático de contas a pagar registradas na tabela <strong>transacoes</strong> que vencerão nos próximos 5 dias.
          </p>

          ${tomorrowBills.length > 0 ? `
            <!-- EMPHASIS BOX FOR TOMORROW / NEXT DAY BILLS -->
            <div style="background-color: #fff7ed; border: 2px solid #f97316; border-radius: 12px; padding: 20px; margin-bottom: 28px; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.15);">
              <div style="margin-bottom: 12px;">
                <h2 style="font-size: 16px; font-weight: 900; color: #c2410c; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  🔥 DESTAQUE URGENTE: CONTAS DO PRÓXIMO DIA (AMANHÃ)
                </h2>
              </div>
              <p style="font-size: 13px; color: #9a3412; margin: 0 0 16px 0; font-weight: 600;">
                Existe(m) <strong>${tomorrowBills.length}</strong> conta(s) no valor total de <strong style="font-size: 15px;">R$ ${totalValTomorrow.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> com vencimento para o próximo dia / amanhã!
              </p>

              <table style="width: 100%; border-collapse: collapse; text-align: left; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #ffedd5; color: #9a3412; font-size: 11px; text-transform: uppercase;">
                    <th style="padding: 10px 14px;">Descrição</th>
                    <th style="padding: 10px 14px;">Categoria</th>
                    <th style="padding: 10px 14px;">Vencimento</th>
                    <th style="padding: 10px 14px; text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${tomorrowHtmlRows}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; color: #166534; font-size: 13px; font-weight: bold;">
              ✅ Nenhuma conta a pagar vencendo no próximo dia (amanhã).
            </div>
          `}

          ${otherBills.length > 0 ? `
            <div style="margin-bottom: 28px;">
              <h3 style="font-size: 14px; font-weight: 800; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                📅 Outras Contas a Vencer nos Próximos 2 a 5 Dias (${otherBills.length})
              </h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase;">
                    <th style="padding: 10px 14px;">Descrição</th>
                    <th style="padding: 10px 14px;">Categoria</th>
                    <th style="padding: 10px 14px;">Vencimento</th>
                    <th style="padding: 10px 14px; text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${otherHtmlRows}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${pending5Days.length === 0 ? `
            <div style="text-align: center; padding: 36px 20px; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; margin-bottom: 24px;">
              <p style="font-size: 15px; font-weight: bold; color: #334155; margin-top: 8px;">Tudo em dia!</p>
              <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Não há contas a pagar pendentes para os próximos 5 dias.</p>
            </div>
          ` : ''}

          <div style="background-color: #f1f5f9; padding: 16px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px;">
            <span style="font-size: 13px; font-weight: bold; color: #475569;">TOTAL A PAGAR (PRÓXIMOS 5 DIAS):</span>
            <span style="font-size: 18px; font-weight: 900; color: #0f172a;">R$ ${totalValAll.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8;">
            E-mail enviado automaticamente via Módulo de Configurações Financeiras.<br/>
            ${churchName}
          </div>

        </div>
      </div>
    `;

    const fromAddress = smtpFrom || smtpUser;
    await transporter.sendMail({
      from: `"${churchName} - Módulo Financeiro" <${fromAddress}>`,
      to: email,
      subject: `🚨 Alerta de Contas a Pagar: ${pending5Days.length} conta(s) nos próximos 5 dias (${tomorrowBills.length} amanhã)`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: `E-mail de alerta enviado com sucesso para ${email}!`,
      billsCount: pending5Days.length,
      tomorrowCount: tomorrowBills.length
    });

  } catch (err: any) {
    console.error('Error sending finance alert email:', err);
    return NextResponse.json(
      { error: `Erro ao enviar e-mail de alerta: ${err.message || String(err)}` },
      { status: 500 }
    );
  }
}
