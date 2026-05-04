import nodemailer from "nodemailer";

type DemoAccessPayload = {
  companyName: string;
  fullName: string;
  corporateEmail: string;
  employeeRange: string;
  requestId: string;
  memberTokens: string[];
  companyToken: string;
  landingUrl: string;
  methodUrl: string;
};

type DemoAccessDeliveryResult = {
  mode: "smtp" | "webhook" | "logged";
};

function getFromAddress() {
  const email = process.env.SMTP_FROM_EMAIL?.trim();
  const name = process.env.SMTP_FROM_NAME?.trim() || "Método Sert";

  if (!email) return null;

  return `"${name}" <${email}>`;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = getFromAddress();

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === "true" || Number(port) === 465,
    auth: {
      user,
      pass,
    },
    from,
  };
}

function buildEmailSubject(payload: DemoAccessPayload) {
  return `Seu acesso de demonstração do Método Sert · ${payload.companyName}`;
}

function buildEmailText(payload: DemoAccessPayload) {
  return [
    `Olá, ${payload.fullName}.`,
    "",
    "Seu acesso de demonstração do Método Sert está pronto.",
    "",
    `Empresa: ${payload.companyName}`,
    `Faixa de colaboradores: ${payload.employeeRange}`,
    "",
    "Acesso empresa:",
    `${payload.companyToken}`,
    "",
    "Tokens individuais:",
    ...payload.memberTokens.map((token, index) => `${index + 1}. ${token}`),
    "",
    `Acesse a demonstração: ${payload.methodUrl}`,
    `Landing page: ${payload.landingUrl}`,
    "",
    "Se precisar, responda este email para continuarmos sua avaliação.",
  ].join("\n");
}

function buildEmailHtml(payload: DemoAccessPayload) {
  const tokenItems = payload.memberTokens
    .map(
      (token) => `
        <li style="margin:0 0 8px 0;padding:12px 14px;border:1px solid rgba(19,34,56,0.08);border-radius:14px;background:#f7fafb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;color:#132238;">
          ${token}
        </li>
      `
    )
    .join("");

  return `
    <div style="margin:0;padding:32px;background:#eef3f6;font-family:Manrope,Arial,sans-serif;color:#132238;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;box-shadow:0 24px 60px rgba(19,34,56,0.08);">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#dff3f0;color:#2f8f8a;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">
          Demonstração liberada
        </div>
        <h1 style="margin:20px 0 12px 0;font-size:38px;line-height:1;letter-spacing:-0.05em;">
          Seu acesso de demonstração está pronto.
        </h1>
        <p style="margin:0 0 24px 0;font-size:18px;line-height:1.7;color:#5f7287;">
          Olá, ${payload.fullName}. Preparamos os acessos da demonstração para <strong style="color:#132238;">${payload.companyName}</strong>.
        </p>

        <div style="padding:20px;border-radius:20px;background:#f7fafb;border:1px solid rgba(19,34,56,0.08);margin-bottom:24px;">
          <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#5f7287;">Token empresa</p>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;color:#18486f;font-weight:700;">
            ${payload.companyToken}
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <p style="margin:0 0 12px 0;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#5f7287;">5 tokens individuais</p>
          <ul style="margin:0;padding:0;list-style:none;">
            ${tokenItems}
          </ul>
        </div>

        <div style="margin-bottom:28px;">
          <a href="${payload.methodUrl}" style="display:inline-block;padding:14px 20px;border-radius:16px;background:#18486f;color:#ffffff;text-decoration:none;font-weight:600;">
            Acessar demonstração
          </a>
        </div>

        <p style="margin:0;font-size:14px;line-height:1.7;color:#5f7287;">
          Caso queira revisar a apresentação da solução, acesse também:
          <a href="${payload.landingUrl}" style="color:#18486f;text-decoration:none;"> landing page do Método Sert</a>.
        </p>
      </div>
    </div>
  `;
}

async function dispatchViaSmtp(payload: DemoAccessPayload) {
  const smtp = getSmtpConfig();
  if (!smtp) return false;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: smtp.from,
    to: payload.corporateEmail,
    subject: buildEmailSubject(payload),
    text: buildEmailText(payload),
    html: buildEmailHtml(payload),
  });

  return true;
}

async function dispatchViaWebhook(payload: DemoAccessPayload) {
  const webhookUrl = process.env.DEMO_REQUEST_WEBHOOK_URL?.trim();
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Falha ao disparar webhook de demonstração (${response.status}).`);
  }

  return true;
}

export async function dispatchDemoAccess(payload: DemoAccessPayload): Promise<DemoAccessDeliveryResult> {
  if (await dispatchViaSmtp(payload)) {
    return { mode: "smtp" };
  }

  if (await dispatchViaWebhook(payload)) {
    return { mode: "webhook" };
  }

  console.info(
    "[demo-access]",
    JSON.stringify({
      mode: "logged",
      ...payload,
    })
  );

  return { mode: "logged" };
}
