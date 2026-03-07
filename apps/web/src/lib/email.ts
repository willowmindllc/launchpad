import { resend } from '@/lib/resend'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

interface InviteEmailParams {
  to: string
  inviterName: string
  projectName: string
  inviteToken: string
}

export async function sendInviteEmail(params: InviteEmailParams) {
  const { to, inviterName, projectName, inviteToken } = params
  const acceptUrl = `${SITE_URL}/invite/accept?token=${inviteToken}`

  const { error } = await resend.emails.send({
    from: 'LaunchPad <noreply@willowmindllc.tech>',
    to,
    subject: `You have been invited to collaborate on ${projectName}`,
    html: buildInviteHtml({ inviterName, projectName, acceptUrl }),
  })

  if (error) {
    console.error('Failed to send invite email:', error)
    throw error
  }
}

function buildInviteHtml(params: {
  inviterName: string
  projectName: string
  acceptUrl: string
}) {
  const { inviterName, projectName, acceptUrl } = params

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <h1 style="margin:0 0 8px;font-size:24px;color:#18181b;">🚀 LaunchPad</h1>
          <p style="margin:0;font-size:14px;color:#71717a;">Project Collaboration Invite</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#27272a;line-height:1.5;">
            <strong>${inviterName}</strong> has invited you to collaborate on
            <strong>${projectName}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${acceptUrl}"
                 style="display:inline-block;padding:12px 32px;background:#18181b;color:#ffffff;
                        text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                Accept Invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
            If the button doesn&rsquo;t work, copy this link:<br/>
            <a href="${acceptUrl}" style="color:#3b82f6;word-break:break-all;">${acceptUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
            You received this because someone invited you to a LaunchPad project.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}
