import nodemailer from 'nodemailer';

let transporter = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn('⚠️  SMTP not configured. Email alerts will be logged but not sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  return transporter;
};

const sendEmail = async (to, subject, htmlContent, textContent = '') => {
  const transport = initializeTransporter();

  if (!transport) {
    console.log(`📧 [EMAIL NOT SENT] To: ${to}, Subject: ${subject}`);
    return { success: false, reason: 'SMTP not configured' };
  }

  try {
    const result = await transport.sendMail({
      from: process.env.FROM_EMAIL || 'noreply@bsint.net',
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`✅ Email sent to ${to}: ${subject}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

const emailTemplates = {
  submissionNotification: (tenderName, submittedBy, submissionType) => ({
    subject: `Tender Submitted: ${tenderName}`,
    html: `
      <h2>Tender Submission Confirmation</h2>
      <p>Tender <strong>${tenderName}</strong> has been submitted.</p>
      <p><strong>Submission Type:</strong> ${submissionType}</p>
      <p><strong>Submitted By:</strong> ${submittedBy}</p>
      <p>Log in to the system to view details.</p>
    `,
    text: `Tender ${tenderName} has been submitted as ${submissionType} by ${submittedBy}.`,
  }),

  feasibilityApproved: (tenderName, approvedBy, notes) => ({
    subject: `Tender Approved: ${tenderName}`,
    html: `
      <h2>Feasibility Approved</h2>
      <p>Tender <strong>${tenderName}</strong> has been approved for document gathering.</p>
      <p><strong>Approved By:</strong> ${approvedBy}</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      <p>Document gathering tasks have been assigned. Check your My Tasks tab.</p>
    `,
    text: `Tender ${tenderName} approved by ${approvedBy}. ${notes ? `Notes: ${notes}` : ''}`,
  }),

  feasibilityRejected: (tenderName, rejectedBy, reason) => ({
    subject: `Tender Rejected: ${tenderName}`,
    html: `
      <h2>Feasibility Rejected</h2>
      <p>Tender <strong>${tenderName}</strong> has been rejected.</p>
      <p><strong>Rejected By:</strong> ${rejectedBy}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>The tender has been archived. Contact your manager for next steps.</p>
    `,
    text: `Tender ${tenderName} rejected by ${rejectedBy}. Reason: ${reason}`,
  }),

  taskAssigned: (tenderName, taskName, assignedBy) => ({
    subject: `New Task: ${taskName} (${tenderName})`,
    html: `
      <h2>Task Assigned</h2>
      <p>You have been assigned a new task: <strong>${taskName}</strong></p>
      <p><strong>Tender:</strong> ${tenderName}</p>
      <p><strong>Assigned By:</strong> ${assignedBy}</p>
      <p>Log in to your My Tasks tab to view details and upload documents.</p>
    `,
    text: `Task assigned: ${taskName} for tender ${tenderName} by ${assignedBy}.`,
  }),

  documentRejected: (tenderName, taskName, rejectionNotes) => ({
    subject: `Document Returned: ${taskName} (${tenderName})`,
    html: `
      <h2>Document Returned for Revision</h2>
      <p>Your document for <strong>${taskName}</strong> has been returned.</p>
      <p><strong>Tender:</strong> ${tenderName}</p>
      <p><strong>Feedback:</strong> ${rejectionNotes}</p>
      <p>Please revise and re-upload your document.</p>
    `,
    text: `Document rejected: ${taskName} for ${tenderName}. Feedback: ${rejectionNotes}`,
  }),

  deadlineReminder: (tenderName, deadline, hoursRemaining, pendingItems) => ({
    subject: `⏰ Deadline Approaching: ${tenderName}`,
    html: `
      <h2>Deadline Reminder</h2>
      <p>Tender <strong>${tenderName}</strong> deadline is approaching.</p>
      <p><strong>Deadline:</strong> ${deadline}</p>
      <p><strong>Time Remaining:</strong> ${hoursRemaining} hours</p>
      <p><strong>Pending Items:</strong> ${pendingItems}</p>
      <p>Please complete all outstanding tasks immediately.</p>
    `,
    text: `Deadline reminder: ${tenderName} due in ${hoursRemaining} hours. ${pendingItems} items pending.`,
  }),

  documentExpiryWarning: (documentName, expiryDate, daysRemaining) => ({
    subject: `⚠️ Document Expiring Soon: ${documentName}`,
    html: `
      <h2>Document Expiry Warning</h2>
      <p>Company document <strong>${documentName}</strong> is expiring soon.</p>
      <p><strong>Expiry Date:</strong> ${expiryDate}</p>
      <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
      <p>Please renew this document in the Company Documents tab.</p>
    `,
    text: `Document ${documentName} expires in ${daysRemaining} days on ${expiryDate}.`,
  }),
};

export { sendEmail, emailTemplates, initializeTransporter };
