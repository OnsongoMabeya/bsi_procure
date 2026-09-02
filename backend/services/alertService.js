import cron from 'node-cron';
import { Op } from 'sequelize';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import CompanyDocument from '../models/CompanyDocument.js';
import { sendEmail, emailTemplates } from './emailService.js';

const createNotification = async (userId, title, body, type, tenderId = null, checklistItemId = null, channel = 'inapp') => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      title,
      body,
      type,
      tender_id: tenderId,
      checklist_item_id: checklistItemId,
      channel,
    });

    if (channel === 'email') {
      const user = await User.findByPk(userId);
      if (user && user.email) {
        const emailResult = await sendEmail(user.email, title, body);
        if (emailResult.success) {
          await notification.update({ email_sent_at: new Date() });
        } else {
          await notification.update({ email_failed: true, email_error: emailResult.error });
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
  }
};

const sendSubmissionNotification = async (tenderId, submittedByUserId) => {
  try {
    const tender = await Tender.findByPk(tenderId, { include: ['creator'] });
    const submitter = await User.findByPk(submittedByUserId);

    if (!tender || !submitter) return;

    const recipients = await User.findAll({
      where: { role: { [Op.in]: ['GM', 'CEO', 'HOT'] } },
    });

    const template = emailTemplates.submissionNotification(
      tender.name,
      submitter.name,
      tender.submission_type
    );

    for (const recipient of recipients) {
      await createNotification(
        recipient.id,
        template.subject,
        template.html,
        'submission',
        tenderId,
        null,
        'email'
      );
    }

    console.log(`✅ Submission notifications sent for tender ${tenderId}`);
  } catch (error) {
    console.error('Error sending submission notifications:', error.message);
  }
};

const sendFeasibilityNotification = async (tenderId, decision, approverUserId, notes = '', reason = '') => {
  try {
    const tender = await Tender.findByPk(tenderId);
    const approver = await User.findByPk(approverUserId);

    if (!tender || !approver) return;

    const recipients = await User.findAll({
      where: { role: { [Op.in]: ['CEO', 'FL', 'INFO'] } },
    });

    let template;
    if (decision === 'approved') {
      template = emailTemplates.feasibilityApproved(tender.name, approver.name, notes);
    } else {
      template = emailTemplates.feasibilityRejected(tender.name, approver.name, reason);
    }

    for (const recipient of recipients) {
      await createNotification(
        recipient.id,
        template.subject,
        template.html,
        'feasibility',
        tenderId,
        null,
        'email'
      );
    }

    console.log(`✅ Feasibility notifications sent for tender ${tenderId}`);
  } catch (error) {
    console.error('Error sending feasibility notifications:', error.message);
  }
};

const sendTaskAssignmentNotification = async (checklistItemId, assignedByUserId) => {
  try {
    const checklistItem = await ChecklistItem.findByPk(checklistItemId, { include: ['tender'] });
    const assignee = await User.findByPk(checklistItem.assigned_to);
    const assignedBy = await User.findByPk(assignedByUserId);

    if (!checklistItem || !assignee || !assignedBy) return;

    const template = emailTemplates.taskAssigned(
      checklistItem.tender.name,
      checklistItem.name,
      assignedBy.name
    );

    await createNotification(
      assignee.id,
      template.subject,
      template.html,
      'task_assignment',
      checklistItem.tender_id,
      checklistItemId,
      'email'
    );

    console.log(`✅ Task assignment notification sent for checklist item ${checklistItemId}`);
  } catch (error) {
    console.error('Error sending task assignment notification:', error.message);
  }
};

const sendDocumentRejectionNotification = async (checklistItemId, rejectionNotes) => {
  try {
    const checklistItem = await ChecklistItem.findByPk(checklistItemId, { include: ['tender'] });

    if (!checklistItem) return;

    const assignee = await User.findByPk(checklistItem.assigned_to);
    if (!assignee) return;

    const template = emailTemplates.documentRejected(
      checklistItem.tender.name,
      checklistItem.name,
      rejectionNotes
    );

    await createNotification(
      assignee.id,
      template.subject,
      template.html,
      'document_rejection',
      checklistItem.tender_id,
      checklistItemId,
      'email'
    );

    console.log(`✅ Document rejection notification sent for checklist item ${checklistItemId}`);
  } catch (error) {
    console.error('Error sending document rejection notification:', error.message);
  }
};

const startDeadlineReminderScheduler = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const tenders = await Tender.findAll({
        where: {
          status: { [Op.in]: ['DOCUMENT_GATHERING', 'ASSEMBLY'] },
          deadline: { [Op.gt]: now },
        },
        include: ['checklistItems'],
      });

      for (const tender of tenders) {
        const hoursRemaining = Math.round((tender.deadline - now) / (1000 * 60 * 60));

        const reminderThresholds = [
          { hours: 168, name: '7 days' },
          { hours: 72, name: '3 days' },
          { hours: 24, name: '1 day' },
          { hours: 12, name: '12 hours' },
          { hours: 6, name: '6 hours' },
          { hours: 2, name: '2 hours' },
        ];

        for (const threshold of reminderThresholds) {
          if (hoursRemaining <= threshold.hours && hoursRemaining > threshold.hours - 1) {
            const pendingItems = tender.checklistItems.filter(
              (item) => item.status !== 'APPROVED'
            ).length;

            if (pendingItems > 0) {
              const recipients = await User.findAll({
                where: { role: { [Op.in]: ['FL', 'INFO'] } },
              });

              const template = emailTemplates.deadlineReminder(
                tender.name,
                tender.deadline.toLocaleString(),
                hoursRemaining,
                pendingItems
              );

              for (const recipient of recipients) {
                await createNotification(
                  recipient.id,
                  template.subject,
                  template.html,
                  'deadline_reminder',
                  tender.id,
                  null,
                  'email'
                );
              }

              console.log(`✅ Deadline reminder sent for tender ${tender.id} (${threshold.name})`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in deadline reminder scheduler:', error.message);
    }
  });

  console.log('✅ Deadline reminder scheduler started (runs hourly)');
};

const startDocumentExpiryScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringDocs = await CompanyDocument.findAll({
        where: {
          expiry_date: {
            [Op.between]: [now, thirtyDaysFromNow],
          },
        },
      });

      const recipients = await User.findAll({
        where: { role: { [Op.in]: ['INFO', 'FL', 'ADMIN'] } },
      });

      for (const doc of expiringDocs) {
        const daysRemaining = Math.round((doc.expiry_date - now) / (1000 * 60 * 60 * 24));

        const template = emailTemplates.documentExpiryWarning(
          doc.name,
          doc.expiry_date.toLocaleDateString(),
          daysRemaining
        );

        for (const recipient of recipients) {
          await createNotification(
            recipient.id,
            template.subject,
            template.html,
            'document_expiry',
            null,
            null,
            'email'
          );
        }

        console.log(`✅ Document expiry warning sent for ${doc.name}`);
      }
    } catch (error) {
      console.error('Error in document expiry scheduler:', error.message);
    }
  });

  console.log('✅ Document expiry scheduler started (runs daily at 9 AM)');
};

export {
  createNotification,
  sendSubmissionNotification,
  sendFeasibilityNotification,
  sendTaskAssignmentNotification,
  sendDocumentRejectionNotification,
  startDeadlineReminderScheduler,
  startDocumentExpiryScheduler,
};
