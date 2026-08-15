import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://udvashh.vercel.app";

const FROM_ADDRESS = "অবনতি <onboarding@resend.dev>";

// ─── Email 1: Notify admin of new signup, include one-click approval link ───

export async function sendAdminApprovalEmail({
  adminEmails,
  userName,
  userEmail,
  approvalToken,
  userId,
}: {
  adminEmails: string[];
  userName: string;
  userEmail: string;
  approvalToken: string;
  userId: string;
}) {
  const approvalUrl = `${SITE_URL}/api/admin/approve?token=${approvalToken}&userId=${userId}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Signup Approval Required</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F5F5F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;border:1px solid #E4E4E7;overflow:hidden;max-width:560px;width:100%;">
          
          <!-- Header bar -->
          <tr>
            <td style="background:#0A0F12;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:800;color:#E8EDF0;letter-spacing:-0.025em;">অবনতি</p>
              <p style="margin:4px 0 0;font-size:12px;color:#5C6A72;font-family:'JetBrains Mono',monospace;">Admin Notification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.02em;">New Account Request</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#71717A;line-height:1.6;">A new user has registered and is waiting for your approval to access the platform.</p>

              <!-- User info card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;border-radius:12px;border:1px solid #E4E4E7;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.08em;">Name</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111111;">${userName || "Not provided"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin:0;font-size:11px;font-weight:600;color:#71717A;text-transform:uppercase;letter-spacing:0.08em;">Email</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#111111;">${userEmail}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Approval CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${approvalUrl}"
                       style="display:inline-block;background:#25A8A2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                      ✓ Approve This User
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#A1A1AA;text-align:center;line-height:1.6;">
                Or copy this link:<br />
                <a href="${approvalUrl}" style="color:#25A8A2;word-break:break-all;">${approvalUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #F4F4F5;">
              <p style="margin:0;font-size:11px;color:#A1A1AA;text-align:center;">
                This email was sent by অবনতি · Only approve users you recognise
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM_ADDRESS,
    to: adminEmails,
    subject: `[অবনতি] New signup — approve ${userEmail}`,
    html,
  });
}

// ─── Email 2: Notify user their account has been approved ───

export async function sendUserApprovedEmail({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName?: string;
}) {
  const loginUrl = `${SITE_URL}/login`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Approved</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F5F5F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;border:1px solid #E4E4E7;overflow:hidden;max-width:560px;width:100%;">
          
          <!-- Header bar -->
          <tr>
            <td style="background:#0A0F12;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:800;color:#E8EDF0;letter-spacing:-0.025em;">অবনতি</p>
              <p style="margin:4px 0 0;font-size:12px;color:#5C6A72;font-family:'JetBrains Mono',monospace;">Account Approved</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <!-- Checkmark icon -->
              <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center" style="width:56px;height:56px;background:#25A8A2;border-radius:50%;font-size:24px;color:white;line-height:56px;">✓</td>
                </tr>
              </table>

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.02em;text-align:center;">
                You&apos;re approved${userName ? `, ${userName}` : ""}!
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6;text-align:center;">
                Your account on অবনতি has been approved by the admin.<br />
                You can now sign in and access all your courses.
              </p>

              <!-- Login CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="display:inline-block;background:#25A8A2;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.01em;">
                      Sign In Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #F4F4F5;">
              <p style="margin:0;font-size:11px;color:#A1A1AA;text-align:center;">
                অবনতি · Your learning platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM_ADDRESS,
    to: [userEmail],
    subject: `[অবনতি] Your account has been approved — sign in now`,
    html,
  });
}
